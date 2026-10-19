#!/usr/bin/env node
/**
 * Cursor `stop` hook. After a completed agent turn, if this repo has uncommitted, unpushed
 * or undeployed work on a ship branch, ask the agent (once) to run the post-task pipeline.
 * Never commits, pushes or deploys by itself; always exits 0 so it can't block the agent.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const respond = (body = {}) => {
  process.stdout.write(JSON.stringify(body));
  process.exit(0);
};

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
} catch {
  input = {};
}
if ((input.status && input.status !== "completed") || Number(input.loop_count ?? 0) > 0) respond();

const root = process.cwd();
const git = (...args) => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
};

let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(root, "scripts", "post-task-deploy.config.json"), "utf8"));
} catch {
  respond();
}

const branch = git("branch", "--show-current");
if (!branch || !config.allowedBranches?.includes(branch)) respond();

const changed = (git("status", "--porcelain") ?? "").split("\n").filter(Boolean).length;
const aheadRaw = git("rev-list", "--count", "@{u}..HEAD");
const unpushed = aheadRaw === null ? 1 : Number(aheadRaw);
const head = git("rev-parse", "HEAD");
let deployedSha = null;
try {
  deployedSha = JSON.parse(fs.readFileSync(path.join(root, ".git", "post-task-deploy-state.json"), "utf8")).sha;
} catch {
  deployedSha = null;
}
const undeployed = Boolean(head) && head !== deployedSha;
if (changed === 0 && unpushed === 0 && !undeployed) respond();

const pending = [
  changed ? `${changed} uncommitted file(s)` : null,
  unpushed ? "commits not pushed to GitHub" : null,
  undeployed ? `HEAD not yet deployed to ${config.siteUrl}` : null,
].filter(Boolean);

respond({
  followup_message:
    `[post-task ship check] ${pending.join("; ")} on ${branch}. ` +
    "If the coding task you just finished is complete and its changes are verified, run the post-task pipeline now: " +
    '`npm run ship -- -m "<what changed and why>" --files <the files changed for this task>` ' +
    "(use --all only if every changed file belongs to the task; with nothing to commit, plain `npm run ship`). " +
    "Report each stage and the live URL it prints; if a stage fails, report the failure and stop - no force-push, reset or new Harvis site. " +
    "If the last request was not a coding task, the work is unfinished, or the user asked not to commit or deploy, do not run it; reply in one short line saying why.",
});
