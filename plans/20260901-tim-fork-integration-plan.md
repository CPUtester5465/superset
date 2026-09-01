# What this fork is for

Fork of `superset-sh/superset` at `CPUtester5465/superset`, tracking upstream `main`. We run Superset Pro on one host (`tims-macbook-pro`), 16 registered projects — 12 GitHub, 4 GitLab (`sibli-*`, under `gitlab.com/sr-ai/ray`). This doc records what we'd want built, what upstream is already doing, and the verdict per track. Surveyed 2026-09-01 against the docs, the changelog, the issue tracker, and the 90 docs in `plans/`.

## 1. GitLab support — wait, with a tripwire

Upstream is GitHub-only by design, not by accident: the FAQ says GitHub runs via the `gh` CLI and "cross-machine project identity is currently tied to GitHub", and triage on the Review pane issue calls it "GitHub-only end to end: remote parsing, project identity, the PR-sync runtime, the tRPC procedures... assume github.com, gh, and Octokit." Nothing in `plans/` mentions GitLab beyond incidental URL parsing.

Tracker state, verified 2026-09-01:

| Item | State | What it is |
|---|---|---|
| [#6445](https://github.com/superset-sh/superset/issues/6445) | open | "Gitlab Support" — the general request |
| [#7017](https://github.com/superset-sh/superset/issues/7017) | open | scoped: MRs in the Review pane via `glab` — MR discovery, CI checks, review status, merge |
| [#7018](https://github.com/superset-sh/superset/pull/7018) | open, active | #7017's own author implementing it — 52 files, +2188/−230, updated 2026-08-31 |
| [#2817](https://github.com/superset-sh/superset/pull/2817) | closed, unmerged | community PR that already did GitLab MRs in the Reviews tab — the map of the seams |
| [#5649](https://github.com/superset-sh/superset/issues/5649) | open | non-GitHub remotes silently duplicate projects across machines; maintainer intends host/local-first identity + explicit cloud link |
| [#5731](https://github.com/superset-sh/superset/pull/5731) | merged 2026-07-19 | the local-first half of #5649 — host.db owns projects, workspace cloud sync retired |
| [#5353](https://github.com/superset-sh/superset/pull/5353) | open, stale | older competing GitLab PR, untouched since 2026-06-27 |

**Verdict (revised 2026-09-01, second pass): don't write code, and the tripwire moved.** The original tripwire — "when #5649 closes, implement #7017 if unclaimed" — is stale on both ends: #5731 already merged the local-first rework #5649 was waiting on (the issue stays open, silent since 2026-07-13, presumably for the explicit-cloud-link half), and #7017 is claimed — its author is building it in #7018. New tripwire: watch #7018. When it merges, test it against the four sibli repos; the likeliest gap is nested-group remotes (`gitlab.com/sr-ai/ray/*`) — upstream's parser regexes are two-segment (`packages/shared/src/github-remote.ts`) and the automated triage on #7017 flags the namespace shape as the first design decision. Building here anyway would be 25–40 files across six subsystems and would collide with #7018. Until then the sibli GitLab repos keep working as local-only projects, which is what they are today anyway.

## 2. Grouping projects in the sidebar — nothing to build

Already in flight upstream: [PR #5981](https://github.com/superset-sh/superset/pull/5981) (maintainer-authored, "group projects into folders in the v2 sidebar", open) and [#4018](https://github.com/superset-sh/superset/issues/4018) (open umbrella — a platform layer above Project for grouping multiple repos, which is the actual shape we wanted: a sibli group and a sub-projects group).

What exists today and covers the gap meanwhile: per-project accent color/icon (project settings — click the thumbnail), workspace pinning, manual sidebar groups of workspaces (multi-select -> Move), and tag folders — a workspace tag files the workspace into a per-project sidebar folder; the `workspace_tag_settings` table carries displayName/color/tabOrder per (project, tag), so renaming a folder is a one-row update, not a retag.

## 3. Cross-workspace session listing — the one candidate contribution

The CLI reference is explicit that this hole is by design: "Workspaces are host-owned; there is no org-wide listing (the desktop app is the cross-host view)." `superset terminals list` takes exactly one `--workspace`; `superset agents list` returns configured presets, not running sessions. Seeing everything from a shell therefore means iterating workspaces client-side — `~/sub-projects/bin/superset-overview.sh` does that today with a jq loop.

A `superset sessions list --local` (or `terminals list --all`) that fans out server-side in the host service would replace that loop and is small enough to land as an outside PR. Before writing it: search the tracker for prior art, and check whether the chat sessions (`agents create` returns `kind: "terminal" | "chat"`) belong in the same listing — a terminals-only view would under-report once chat sessions are in use.

Both checks done 2026-09-01: no prior art in the tracker, and the change is smaller than guessed. The tRPC procedure (`terminal.list`, `packages/host-service/src/trpc/router/terminal/terminal.ts:130`) already takes an optional `workspaceId`, and the handler (`listLiveTerminalSessions`, `packages/host-service/src/terminal/terminal.ts:861`) is documented "host-wide by default" — it reads the `terminal_sessions` table directly, no per-workspace fan-out needed. The `--workspace` requirement is artificial, imposed only at the CLI edge (`packages/cli/src/commands/terminals/list/command.ts:10`) and the MCP tool mirror. The chat worry is moot: `AgentKind` (`packages/shared/src/agent-definition.ts:14`) is `"terminal"` only now, the `"chat"` union is dead outside stale docs. Decision 2026-09-01: implement the minimal version — optional `--workspace`, host-wide default, a WORKSPACE column in the output, MCP parity, docs line.

## Not in scope

Slack/Linear integrations (Pro, already usable — connect via dashboard Integrations), the PR view (GitHub side is done and free-tier), and anything touching the relay. This fork is not a divergence — branches here are per-track, rebased on upstream `main`, and exist to become upstream PRs or die.
