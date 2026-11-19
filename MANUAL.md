# Release manual

How to version and publish `@usecalendar/core` and `@usecalendar/react` to npm. Only the maintainer does this, and
only through GitHub Actions (`.github/workflows/publish.yml`). **Never run `npm publish` or `pnpm publish` locally.**

## How it works

- Merging to `main` publishes nothing.
- Versions are **not** bumped automatically. `pnpm run version-packages` (changesets) bumps them from the pending
  `.changeset/*.md` files and writes each package's `CHANGELOG.md`.
- Publishing a **GitHub Release** starts the workflow. It runs typecheck → lint → test → build → smoke check, then
  publishes every package whose `package.json` version isn't on npm yet (core first). A version that's already on npm
  is skipped, so a release without a version bump publishes nothing.
- Releasing core always patch-bumps react too, because react depends on the exact core version.

## One-time setup

- GitHub secret `NPM_TOKEN`: an npm **Automation** token with publish access to the `@usecalendar` scope, in
  repository → **Settings** → **Secrets and variables** → **Actions**.
- GitHub CLI logged in: `gh auth status`.

## 1. While developing: add changesets

Every PR that changes what a published package does includes a changeset:

```sh
pnpm changeset   # pick the packages, the bump (major / minor / patch) and write a summary for consumers
```

Commit the generated `.changeset/*.md` with the change. Pending changesets accumulate on `main` until the next release.

## 2. Bump the versions

```sh
git checkout main
git pull
git status                       # must be clean
ls .changeset                    # the pending changesets (besides config.json and README.md)

git checkout -b release/v0.2.0   # use the new version number
pnpm run version-packages        # bumps versions, writes CHANGELOGs, deletes the consumed changesets
```

Review the result:

```sh
git diff                                     # versions and CHANGELOG entries
grep '"version"' packages/*/package.json     # the new versions
ls .changeset                                # only config.json and README.md should be left
```

## 3. Check everything locally

The same gate the workflow runs:

```sh
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run smoke:pack
```

## 4. Merge the version bump

```sh
git add .changeset packages/core/package.json packages/core/CHANGELOG.md packages/react/package.json packages/react/CHANGELOG.md
git commit -m "chore: release v0.2.0"
git push -u origin release/v0.2.0
gh pr create --base main --title "chore: release v0.2.0" --body "Version bump and changelogs for the next release."
```

Merge the PR on GitHub, then update your local `main`:

```sh
git checkout main
git pull
```

## 5. Publish the GitHub Release

Tag it with the new version, on `main`, using the CHANGELOG entries as notes:

```sh
gh release create v0.2.0 --target main --title "v0.2.0" --notes-file packages/react/CHANGELOG.md
```

Or use the web form: <https://github.com/SebastianUrdaneguiBisalaya/usecalendar/releases/new>. When the packages
end up on different versions, name the tag after the package(s) released, e.g. `@usecalendar/react@0.2.1`.

## 6. Follow the workflow and verify

```sh
gh run list --workflow publish.yml --limit 1
gh run watch                       # pick the running publish workflow

pnpm view @usecalendar/core version
pnpm view @usecalendar/react version
```

## Troubleshooting

| Problem | What to do |
|---|---|
| The workflow says every version "is already on npm, skipping." | The versions weren't bumped. Go back to step 2. |
| A check failed before publishing | Nothing was published. Fix it in a PR, merge, then re-run: `gh run rerun <run-id>`. |
| Core was published but react failed | Fix and re-run the workflow: core is skipped, react is published. |
| `pnpm view` fails with an auth or network error | The workflow stops on purpose. Check `NPM_TOKEN` and re-run. |
| A wrong version was published | npm versions can't be reused. Fix it and release a new patch version. |
