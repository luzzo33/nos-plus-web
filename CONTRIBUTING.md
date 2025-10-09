# Contributing to NOS.plus Alpha

Community input strengthens NOS.plus Alpha. Please follow the guidelines below to keep changes reviewable, consistent, and respectful.

## Branching Model

- Create topic branches from `main` using the prefixes `feature/<scope>` or `fix/<scope>`.
- Keep branches focused on a single issue or enhancement to simplify review and release planning.

## Commit Standards

- Use Conventional Commits with the allowed types `feat:`, `fix:`, `chore:`, and `ui:`. Example: `feat: add staking APR widget`.
- Write meaningful commit bodies when additional context is necessary (e.g., links to issues, design notes, or trade-offs).

## Local Quality Checks

- Run `npm run lint`, `npm run build:alpha`, and `npm run release` before pushing. These commands surface lint errors, build regressions, and release metadata drift.
- Keep dependencies up to date by using `npm ci` to ensure a clean lockfile state.

## Pull Requests

- Rebase against `main` and resolve conflicts locally before opening a pull request.
- Provide a concise summary, testing notes, and any screenshots that help reviewers understand the change.
- Confirm that the GitHub Actions Build workflow reports green status on the branch.

## Translations and Locales

- Update locale files in `messages/<locale>/` whenever UI copy changes. Missing keys should be stubbed with English placeholders until translations are supplied.
- Run `npm run check:translations` to verify coverage and include the output in the pull request if new locales are touched.

## Changelog Management

- Record user-facing updates in `CHANGELOG.md` under the appropriate release heading.
- Use the same Conventional Commit terminology when drafting changelog entries to maintain parity with the commit history.

## Collaboration Conduct

- Treat collaborators, maintainers, and community testers with respect. Offensive or discriminatory language is not tolerated.
- Follow the [SECURITY.md](./SECURITY.md) process for vulnerability reports instead of opening public issues.

Thank you for helping improve NOS.plus Alpha for the Nosana community.
