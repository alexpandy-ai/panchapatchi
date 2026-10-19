# பஞ்ச பட்சி (Pancha Pakshi)

Static **React + Vite** app. Schedule tables live in TypeScript (`src/data/patchiScheduleData.ts`) — **no backend or database** required.

## Project structure

```
panchapatchi/
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── data/patchiScheduleData.ts   # Patchi Schedule tables (in-code)
│   └── utils/
├── scripts/                         # Optional one-off Excel helpers
├── public/
└── vite.config.ts
```

## Run locally

```powershell
cd D:\alex\apps\panchapatchi
npm install
npm run dev
```

Open http://localhost:5173

## Build / preview

```powershell
npm run build
npm run preview
```

## Deploy

Harvis (and similar static hosts) serve the Vite `dist/` output only:

```powershell
npm run build
npx harvis deploy dist
```

## Post-task ship pipeline

`npm run ship` takes a finished change live in one go. It runs these stages in order and stops at the first failure, exiting with a non-zero code:

1. **Preflight.** The branch must be listed in `allowedBranches`, `origin` must point at the configured GitHub repo, the remote branch must not have commits you're missing, and a deploy token must be saved for the Harvis site.
2. **Verify.** Runs `npm test`, `npm run lint` and `npm run build`.
3. **Commit.** Stages only the files you name and refuses secret-looking files (`.env`, keys, credentials). It scans the staged diff for tokens, including the saved Harvis deploy tokens, and then commits. It never creates an empty commit.
4. **Push.** Runs a plain `git push` with no force-push, then confirms GitHub has the new commit.
5. **Deploy.** Runs only after the push succeeds. It deploys `dist` with `npx harvis deploy dist --subdomain pakshi` and requires Harvis to confirm "Updated: https://pakshi.harvis.page". It then checks that the live site serves the new build.

Rerunning is safe. With no changes, nothing to push, and the current commit already deployed, it does nothing. The last deployed commit is recorded in `.git/post-task-deploy-state.json`, which is never committed.

```powershell
npm run ship -- -m "Find Patchi: show both birds on one line" --files src/index.css
npm run ship -- -m "Rename Thithi Details chips" --all   # every changed file belongs to the task
npm run ship                                             # only push/deploy already-committed work
npm run ship -- --check-only                             # test + lint + build, nothing else
npm run ship -- --force-deploy                           # redeploy the current commit
```

If you commit only some changed files, the commit is pushed but the deploy is skipped. Otherwise the uncommitted files would be in the build. Commit or stash them, then run `npm run ship` again.

### With Cursor Agent

- `.cursor/rules/post-task-ship.mdc` tells the agent to run `npm run ship -- -m "..." --files ...` as the last step of every completed coding task.
- `.cursor/hooks.json` registers a `stop` hook, `.cursor/hooks/post-task-ship-reminder.mjs`. When an agent turn ends with uncommitted, unpushed or undeployed work on a ship branch, the hook sends the agent one follow-up asking it to run the pipeline, or to say why not (for example, the work is unfinished or the request was only a question). The hook never commits or deploys by itself.
- Check that the hook is loaded in Cursor Settings → Hooks. Its runs appear in the "Hooks" output channel.

### Setup (once per machine)

- Install Node.js 18+ and Git, and run `npm install`.
- Make sure GitHub push access works. A plain `git push` from this folder should succeed using Git Credential Manager or `gh auth login`.
- Save the Harvis deploy token for the `pakshi` site from this folder: run `npx harvis link --token <pakshi deploy token>` in your own terminal, then deploy once with `npx harvis deploy dist`. The token is stored in Harvis's own credentials file (`%APPDATA%\harvis\credentials.json` on Windows), never in this repo.
- Settings are in `scripts/post-task-deploy.config.json`: remote, allowed branches, checks, output folder, Harvis site and URL. Add a branch to `allowedBranches` only if it should deploy to production.

### Troubleshooting

| Message | Fix |
|---|---|
| `[preflight] Branch "x" is not in allowedBranches` | Switch branches, or add it to the config if it should go live. |
| `[preflight] ... has commits you don't have` | `git pull`, resolve any conflicts yourself, then rerun. |
| `[preflight] No saved deploy token for Harvis site "pakshi"` | Run the `npx harvis link` setup step above. |
| `[verify] "npm run …" failed` | Fix the failing test, lint or build. Nothing was committed or deployed. |
| `[commit] Possible secrets in the staged changes` | Remove the secret from the file. Its contents are never printed, and the files are unstaged again. |
| `[push] git push failed` | Fix GitHub sign-in or write access (Git Credential Manager or `gh auth login`). Never force-push. |
| `[deploy] Pushed, but not deploying: uncommitted changes…` | Commit or stash the leftover files, then run `npm run ship`. |
| `[deploy] Harvis reported a NEW site` or `updated …, not https://pakshi.harvis.page` | Stop and check the Harvis dashboard. The token or site link is wrong. |

A stray `HARVIS_DEPLOY_TOKEN` or `HARVIS_SUBDOMAIN` environment variable is ignored during deploys, so it can't redirect them to another site.

## Notes

- Patchi Schedule, Status, and Day Scheduler all read `PATCHI_SCHEDULE_DATA` from source — no API calls.
- `scripts/build-data.mjs` can regenerate table data from Excel if you ever need to refresh the TypeScript dump (`xlsx` is a devDependency for that only).
