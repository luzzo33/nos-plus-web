# Private Release Checklist

Use this list to verify the repository before the private beta and again prior to the public launch.

## Repository Hygiene
- [ ] Confirm `.env.local` contains staging values only and remains untracked.
- [ ] Run `git status` and ensure no secrets or generated artifacts are staged.
- [ ] Verify `.gitignore` exclusions for `node_modules/`, `.next/`, `dist/`, `logs/`, `tmp/`, `*.tsbuildinfo`, and `.env*`.
- [ ] Run the secret scans: `git grep -i "api_key"`, `git grep -i "secret"`, and `git grep -i "token"`.

## Quality Gates
- [ ] Install dependencies with `npm ci`.
- [ ] Build the project: `npm run build`.
- [ ] Lint: `npm run lint`.
- [ ] Format check: `npm run format`.
- [ ] Review GitHub Actions run for the last commit (CI badge in README).

## Documentation & Metadata
- [ ] README up to date with environment notes and internal testing guidance.
- [ ] CHANGELOG updated with the latest private-release notes.
- [ ] CONTRIBUTING.md reflects the current branch strategy.
- [ ] LICENSE still appropriate for upcoming release.

## Branch Protection
- [ ] Default branch set to `main`.
- [ ] Require PR approvals and status checks (lint + build).
- [ ] Auto-delete merged branches enabled.
- [ ] Optional `develop` branch synced with `main`.

## Collaboration
- [ ] Confirm repository visibility is set to **Private**.
- [ ] Invite internal collaborators/bots with the correct permission level.
- [ ] Verify “Issues” enabled, “Wiki” and “Projects” disabled (or intentionally configured).
- [ ] Review audit log for unexpected access changes.

## Pre-Public Checklist
- [ ] Tag release candidate (e.g. `git tag -a v0.9.0 -m "Private beta before public launch"`).
- [ ] Push tag: `git push origin v0.9.0`.
- [ ] Prepare announcement / release notes draft.
- [ ] Double-check there are no pending legal or compliance blockers.
- [ ] When ready, flip visibility to Public in GitHub settings and confirm README badges render.
