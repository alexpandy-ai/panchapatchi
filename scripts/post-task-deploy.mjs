#!/usr/bin/env node
/**
 * Post-task pipeline: verify → commit → push → deploy to Harvis, strictly in that order.
 * Stops at the first failing stage with a non-zero exit code. Safe to rerun: with no new
 * changes, nothing unpushed and HEAD already deployed, it does nothing.
 *
 *   npm run ship -- -m "message" --files <paths...>   commit only these changed files
 *   npm run ship -- -m "message" --all                commit every changed file
 *   npm run ship                                      push/deploy already-committed work
 *   npm run ship -- --check-only                      run the checks only
 *   npm run ship -- --force-deploy                    redeploy even if HEAD was deployed
 *
 * Settings: scripts/post-task-deploy.config.json. See README "Post-task ship pipeline".
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts", "post-task-deploy.config.json"), "utf8"),
);
const STATE_FILE = path.join(ROOT, ".git", "post-task-deploy-state.json");
const IS_WIN = process.platform === "win32";
const MAX_BUFFER = 64 * 1024 * 1024;

const EXIT = { usage: 2, preflight: 3, verify: 10, commit: 20, push: 30, deploy: 40, liveCheck: 41, partial: 50 };

class StageError extends Error {
  constructor(stage, message, code = EXIT[stage] ?? 1) {
    super(message);
    this.stage = stage;
    this.code = code;
  }
}

const fail = (stage, message, code) => {
  throw new StageError(stage, message, code);
};
const log = (stage, message) => console.log(`[ship] [${stage}] ${message}`);

/* ---------- helpers ---------- */

let knownSecrets = [];

function redact(text) {
  let out = String(text ?? "");
  for (const secret of knownSecrets) out = out.split(secret).join("<redacted>");
  return out
    .replace(/(https?:\/\/)[^/\s@]+@/gi, "$1***@")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<redacted>");
}

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: MAX_BUFFER });
  return { code: r.status ?? 1, out: r.stdout ?? "", err: r.stderr ?? "" };
}

function gitOk(stage, args) {
  const r = git(args);
  if (r.code !== 0) fail(stage, `git ${args[0]} failed: ${redact(r.err || r.out).trim()}`);
  return r.out.trim();
}

/** Runs an npm/npx command line built only from config constants (no user input). */
function runCommand(commandLine, { capture = false, env = process.env } = {}) {
  const r = spawnSync(commandLine, {
    cwd: ROOT,
    shell: true,
    env,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  return { code: r.status ?? 1, out: r.stdout ?? "", err: r.stderr ?? "" };
}

function changedFiles() {
  const raw = git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]).out;
  const parts = raw.split("\0").filter(Boolean);
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const xy = parts[i].slice(0, 2);
    files.push(parts[i].slice(3));
    if (xy[0] === "R" || xy[0] === "C") i++;
  }
  return files;
}

function stagedFiles() {
  return git(["diff", "--cached", "--name-only", "-z"]).out.split("\0").filter(Boolean);
}

const toPosix = (file) => file.replace(/\\/g, "/").replace(/^\.\//, "");
const normUrl = (url) =>
  String(url ?? "")
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)[^/@]+@/, "$1")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

/* ---------- secrets ---------- */

const SECRET_FILE_RULES = [
  [/(^|\/)\.env(\.(?!example$|sample$|template$)[^/]+)?$/i, ".env file"],
  [/\.(pem|key|p12|pfx|jks|keystore|ppk)$/i, "key/certificate file"],
  [/(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i, "SSH key"],
  [/(^|\/)[^/]*credentials?[^/]*\.json$/i, "credentials file"],
  [/(^|\/)\.(npmrc|netrc|git-credentials)$/i, "auth config file"],
  [/(^|\/)secrets?(\.[^/]+)?$/i, "secrets file"],
];

const SECRET_CONTENT_RULES = [
  [new RegExp("-----BEGIN [A-Z ]*PRIVATE" + " KEY-----"), "private key block"],
  [/\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/, "GitHub token"],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}/, "GitHub fine-grained token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, "Slack token"],
  [/\bsk-[A-Za-z0-9_-]{20,}/, "API secret key"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "Google API key"],
  [/(token|secret|passw(or)?d|api[_-]?key)["']?\s*[:=]\s*["'][^"'\s]{12,}["']/i, "hardcoded credential"],
  [/(token|secret|key)[^\n]{0,40}\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, "token-like UUID"],
];

function secretFileRule(file) {
  return SECRET_FILE_RULES.find(([re]) => re.test(file))?.[1] ?? null;
}

/** Findings as { file, rule } only; the matched text is never printed. */
function scanStagedDiff() {
  const diff = git(["diff", "--cached", "--no-color", "--no-ext-diff", "--unified=0"]).out;
  const findings = [];
  let file = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      file = line.replace(/^\+\+\+ (b\/)?/, "");
      continue;
    }
    if (!line.startsWith("+")) continue;
    if (knownSecrets.some((secret) => line.includes(secret))) findings.push({ file, rule: "saved deploy token" });
    for (const [re, rule] of SECRET_CONTENT_RULES) if (re.test(line)) findings.push({ file, rule });
  }
  return findings;
}

/* ---------- Harvis ---------- */

function harvisCredentialsPath() {
  const dir = process.env.HARVIS_CONFIG_DIR
    ? path.resolve(process.env.HARVIS_CONFIG_DIR)
    : IS_WIN && process.env.APPDATA
      ? path.join(process.env.APPDATA, "harvis")
      : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "harvis");
  return path.join(dir, "credentials.json");
}

function loadHarvisSite() {
  const file = harvisCredentialsPath();
  let creds;
  try {
    creds = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    fail("preflight", `No Harvis credentials at ${file}. Link this folder once: npx harvis link --token <pakshi deploy token>`);
  }
  for (const site of Object.values(creds.sites ?? {})) if (site?.deployToken) knownSecrets.push(site.deployToken);
  for (const token of Object.values(creds.tokens ?? {})) if (typeof token === "string") knownSecrets.push(token);
  if (process.env.HARVIS_DEPLOY_TOKEN) knownSecrets.push(process.env.HARVIS_DEPLOY_TOKEN);
  knownSecrets = [...new Set(knownSecrets.filter((s) => s.length >= 16))];

  const site = creds.sites?.[CONFIG.harvisSite];
  if (!site?.deployToken) {
    fail(
      "preflight",
      `No saved deploy token for Harvis site "${CONFIG.harvisSite}". From ${ROOT} run: npx harvis link --token <pakshi deploy token>, deploy once with "npx harvis deploy ${CONFIG.outDir}", then rerun.`,
    );
  }
  if (site.url && normUrl(site.url) !== normUrl(CONFIG.siteUrl)) {
    fail("preflight", `Saved Harvis site "${CONFIG.harvisSite}" points at ${site.url}, expected ${CONFIG.siteUrl}. Not deploying.`);
  }
}

function harvisEnv() {
  const env = { ...process.env };
  delete env.HARVIS_DEPLOY_TOKEN;
  delete env.HARVIS_SUBDOMAIN;
  return env;
}

async function liveCheck(asset) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(`${CONFIG.siteUrl}/?ship=${Date.now()}`, { cache: "no-store" });
      const html = await res.text();
      if (res.ok && (!asset || html.includes(asset))) return `HTTP ${res.status}${asset ? `, serving ${asset}` : ""}`;
      log("live", `attempt ${attempt}: HTTP ${res.status}${asset ? ", new build not visible yet" : ""}`);
    } catch (error) {
      log("live", `attempt ${attempt}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return null;
}

/* ---------- pipeline ---------- */

function parseArgs(argv) {
  const args = { message: null, files: null, all: false, checkOnly: false, forceDeploy: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-m" || a === "--message") args.message = argv[++i]?.trim() || null;
    else if (a === "--all") args.all = true;
    else if (a === "--files") {
      args.files = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith("-")) args.files.push(toPosix(argv[++i]));
    } else if (a === "--check-only") args.checkOnly = true;
    else if (a === "--force-deploy") args.forceDeploy = true;
    else fail("usage", `Unknown argument "${a}". See the header of scripts/post-task-deploy.mjs.`);
  }
  if (args.files && args.all) fail("usage", "Use either --files or --all, not both.");
  if (args.files && args.files.length === 0) fail("usage", "--files needs at least one path.");
  return args;
}

function validateConfig() {
  if (!/^[a-z0-9-]+$/.test(CONFIG.harvisSite)) fail("preflight", "Invalid harvisSite in config.");
  if (!/^[\w./-]+$/.test(CONFIG.outDir)) fail("preflight", "Invalid outDir in config.");
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).scripts ?? {};
  for (const check of CONFIG.checks) {
    if (!/^[\w:-]+$/.test(check) || !scripts[check]) fail("preflight", `package.json has no "${check}" script.`);
  }
  if (!CONFIG.checks.includes("build")) fail("preflight", 'Config checks must include "build" so the deployed output matches the commit.');
}

const AUTH_HINT =
  "Check GitHub access: run `git push` manually to see the prompt, sign in through Git Credential Manager (or `gh auth login`), and make sure your account can write to the repository.";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateConfig();

  /* preflight */
  if (git(["rev-parse", "--is-inside-work-tree"]).out.trim() !== "true") fail("preflight", `${ROOT} is not a Git work tree.`);
  const branch = gitOk("preflight", ["branch", "--show-current"]);
  if (!branch) fail("preflight", "Detached HEAD; check out a branch first.");
  if (!CONFIG.allowedBranches.includes(branch)) {
    fail("preflight", `Branch "${branch}" is not in allowedBranches (${CONFIG.allowedBranches.join(", ")}). Add it to the config only if it should go live.`);
  }
  const remoteUrl = git(["remote", "get-url", CONFIG.remote]).out.trim();
  if (normUrl(remoteUrl) !== normUrl(CONFIG.remoteUrl)) {
    fail("preflight", `Remote "${CONFIG.remote}" is ${redact(remoteUrl) || "missing"}, expected ${CONFIG.remoteUrl}.`);
  }
  log("preflight", `repo ${CONFIG.remoteUrl}, branch ${branch}`);
  loadHarvisSite();
  log("preflight", `Harvis site "${CONFIG.harvisSite}" (${CONFIG.siteUrl}) has a saved deploy token`);

  const fetched = git(["fetch", "--quiet", CONFIG.remote, branch]);
  const remoteRef = `refs/remotes/${CONFIG.remote}/${branch}`;
  if (fetched.code !== 0 && !/couldn't find remote ref/i.test(fetched.err)) {
    fail("preflight", `git fetch failed: ${redact(fetched.err).trim()}\n${AUTH_HINT}`);
  }
  const hasRemoteBranch = fetched.code === 0 && git(["rev-parse", "--verify", "--quiet", remoteRef]).code === 0;
  const countCommits = (range) => Number(gitOk("preflight", ["rev-list", "--count", range]));
  if (hasRemoteBranch && countCommits(`HEAD..${remoteRef}`) > 0) {
    fail("preflight", `${CONFIG.remote}/${branch} has commits you don't have. Pull and resolve any conflicts manually, then rerun.`);
  }

  const changes = changedFiles();
  const head = gitOk("preflight", ["rev-parse", "HEAD"]);
  const unpushed = hasRemoteBranch ? countCommits(`${remoteRef}..HEAD`) : 1;
  const deployedSha = readState()?.sha ?? null;
  if (!args.checkOnly && !args.forceDeploy && changes.length === 0 && unpushed === 0 && deployedSha === head) {
    log("done", `Nothing to do: no changes, nothing to push, ${head.slice(0, 7)} already live at ${CONFIG.siteUrl}`);
    return 0;
  }

  /* choose files */
  let toStage = [];
  if (changes.length > 0 && !args.checkOnly) {
    if (!args.message) fail("usage", `There are ${changes.length} changed file(s); pass a commit message with -m "...".`);
    if (!args.all && !args.files) {
      fail("usage", `Choose what to commit with --files <paths...> or --all. Changed:\n  ${changes.join("\n  ")}`);
    }
    if (args.files) {
      const unknown = args.files.filter((file) => !changes.includes(file));
      if (unknown.length) fail("usage", `Not changed (or misspelled): ${unknown.join(", ")}. Changed:\n  ${changes.join("\n  ")}`);
      toStage = args.files;
    } else {
      toStage = changes;
    }
    const preStaged = stagedFiles().filter((file) => !toStage.includes(file));
    if (preStaged.length) fail("usage", `Already staged but not selected: ${preStaged.join(", ")}. Include or unstage them.`);
    const secretFiles = toStage.map((file) => [file, secretFileRule(file)]).filter(([, rule]) => rule);
    if (secretFiles.length) {
      fail("commit", `Refusing to commit secret-looking files: ${secretFiles.map(([f, r]) => `${f} (${r})`).join(", ")}. Add them to .gitignore.`);
    }
    log("plan", `will commit ${toStage.length} file(s):\n  ${toStage.join("\n  ")}`);
    const leftover = changes.filter((file) => !toStage.includes(file));
    if (leftover.length) log("plan", `left uncommitted (deploy will be skipped):\n  ${leftover.join("\n  ")}`);
  }

  /* A: verify */
  for (const check of CONFIG.checks) {
    log("verify", `npm run ${check}`);
    const r = runCommand(`npm run ${check}`);
    if (r.code !== 0) fail("verify", `"npm run ${check}" failed (exit ${r.code}). Nothing was committed, pushed or deployed.`);
  }
  log("verify", `passed: ${CONFIG.checks.join(", ")}`);
  if (args.checkOnly) return 0;

  /* B: commit */
  if (toStage.length > 0) {
    gitOk("commit", ["add", "--", ...toStage]);
    const findings = scanStagedDiff();
    if (findings.length) {
      git(["restore", "--staged", "--", ...toStage]);
      const list = [...new Set(findings.map(({ file, rule }) => `${file}: ${rule}`))].join("\n  ");
      fail("commit", `Possible secrets in the staged changes (unstaged again, nothing committed):\n  ${list}`);
    }
    const committed = git(["commit", "-m", args.message]);
    if (committed.code !== 0) {
      git(["restore", "--staged", "--", ...toStage]);
      fail("commit", `git commit failed: ${redact(committed.err || committed.out).trim()}`);
    }
    log("commit", `${gitOk("commit", ["rev-parse", "--short", "HEAD"])} ${args.message}`);
  } else {
    log("commit", "no uncommitted changes; nothing to commit");
  }
  const newHead = gitOk("commit", ["rev-parse", "HEAD"]);

  /* C: push */
  const needsPush = !hasRemoteBranch || countCommits(`${remoteRef}..HEAD`) > 0;
  if (needsPush) {
    log("push", `git push ${CONFIG.remote} ${branch}`);
    const pushed = git(["push", "-u", CONFIG.remote, branch]);
    if (pushed.code !== 0) {
      const detail = redact(pushed.err || pushed.out).trim();
      const auth = /auth|permission|denied|403|401|could not read username|repository not found/i.test(detail);
      fail("push", `git push failed: ${detail}${auth ? `\n${AUTH_HINT}` : "\nIf the remote moved on, pull and resolve manually; never force-push."}\nNothing was deployed.`);
    }
  } else {
    log("push", `${CONFIG.remote}/${branch} already has ${newHead.slice(0, 7)}`);
  }
  const remoteHead = git(["ls-remote", CONFIG.remote, `refs/heads/${branch}`]).out.split(/\s/)[0];
  if (remoteHead !== newHead) fail("push", `${CONFIG.remote}/${branch} is at ${remoteHead || "nothing"}, expected ${newHead.slice(0, 7)}. Nothing was deployed.`);
  log("push", `${CONFIG.remote}/${branch} is at ${newHead.slice(0, 7)}`);

  /* D: deploy */
  const leftover = changedFiles();
  if (leftover.length) {
    fail(
      "deploy",
      `Pushed, but not deploying: uncommitted changes are in the build and would go live without being in Git:\n  ${leftover.join("\n  ")}\nCommit or stash them, then run "npm run ship".`,
      EXIT.partial,
    );
  }
  if (!args.forceDeploy && readState()?.sha === newHead) {
    log("done", `${newHead.slice(0, 7)} is already live at ${CONFIG.siteUrl}`);
    return 0;
  }
  const indexHtml = path.join(ROOT, CONFIG.outDir, "index.html");
  if (!fs.existsSync(indexHtml)) fail("deploy", `${CONFIG.outDir}/index.html is missing after the build.`);
  const asset = fs.readFileSync(indexHtml, "utf8").match(/assets\/index-[\w-]+\.js/)?.[0] ?? null;

  log("deploy", `npx harvis deploy ${CONFIG.outDir} --subdomain ${CONFIG.harvisSite}`);
  const deployed = runCommand(`npx --yes harvis deploy ${CONFIG.outDir} --subdomain ${CONFIG.harvisSite}`, {
    capture: true,
    env: harvisEnv(),
  });
  const output = redact(`${deployed.out}\n${deployed.err}`).trim();
  if (output) console.log(output.replace(/^/gm, "  | "));
  if (deployed.code !== 0) fail("deploy", `Harvis deploy failed (exit ${deployed.code}). ${CONFIG.siteUrl} was not updated by this run.`);
  if (/Live site:/i.test(output)) {
    fail("deploy", `Harvis reported a NEW site instead of updating ${CONFIG.siteUrl}. Production was not updated; check the Harvis dashboard.`);
  }
  const updatedUrl = output.match(/Updated:\s+(\S+)/i)?.[1];
  if (!updatedUrl) fail("deploy", "Harvis did not confirm an update; not treating this as deployed.");
  if (normUrl(updatedUrl) !== normUrl(CONFIG.siteUrl)) {
    fail("deploy", `Harvis updated ${updatedUrl}, not ${CONFIG.siteUrl}. Check the Harvis dashboard immediately.`);
  }
  fs.writeFileSync(
    STATE_FILE,
    `${JSON.stringify({ sha: newHead, branch, url: CONFIG.siteUrl, asset, deployedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  log("deploy", `Harvis confirmed: Updated ${updatedUrl}`);

  const live = await liveCheck(asset);
  if (!live) fail("live", `Harvis confirmed the deploy, but ${CONFIG.siteUrl} did not serve ${asset ?? "the site"} within 30 s. Check it in a browser.`, EXIT.liveCheck);
  log("live", `${CONFIG.siteUrl} reachable (${live})`);
  log("done", `${newHead.slice(0, 7)} on ${branch} is pushed and live at ${CONFIG.siteUrl}`);
  return 0;
}

// exitCode, not process.exit(): exiting while fetch sockets close aborts Node on Windows.
main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    if (error instanceof StageError) {
      console.error(`[ship] [${error.stage}] FAILED: ${error.message}`);
      process.exitCode = error.code;
      return;
    }
    console.error(`[ship] FAILED: ${redact(error?.stack ?? error)}`);
    process.exitCode = 1;
  },
);
