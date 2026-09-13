# Kenneth publishing engine

This standalone Quartz 5 checkout runs outside Note Roots. `publishing-parity`
includes upstream v5 `f1fba3fc55cbf60a60a5d09c95a49c042cdab63a`, the custom
site profile from the prior migration, and verified corrections against the
deployed v4 site source `ae6d68d945106783abba8be1ef574edad2ac3c7d` / Quartz
`e8d281a`. Dependency versions are fixed by `package-lock.json`; use Node 24
and `npm ci`.

```sh
node scripts/exograph-publish.mjs --input /absolute/snapshot \
  --output /absolute/fresh-site --site-url https://kenneth.computer --action preview
node --test scripts/exograph-publish.test.mjs
```

Exograph owns source eligibility, privacy projection, snapshotting, and the local
HTTP preview server. The engine accepts an immutable snapshot and fresh output
directory. `preview` disables analytics; `prepare` builds a deployable artifact.
Both emit one JSON receipt on stdout and build diagnostics on stderr. Errors exit
nonzero. Input is hash-checked again after building; symlinks are rejected. The
private build receipt is a sibling of the output, never inside the public site.

`scripts/exograph-publish.mjs` is this theme's optional build hook. Exograph can
also build a standard Quartz 5 checkout without that file, using its own Quartz
runner. This theme keeps the hook because it validates route collisions before
building, emits the site's legacy v4 case aliases, and repairs generated links
to unlisted-only folders and tags afterward. These helpers, the generated-route
allowlist, and all Kenneth-specific rendering stay in this repository. A custom
theme does not need to copy them unless it needs those behaviors. The hook uses
the same immutable snapshot and fresh output boundary as the default runner;
it never decides which private vault files are eligible for publication.

The site profile retains IBM Plex Mono, light/dark palettes, font toggle,
homepage/recent sections, image treatment, and footer. Ordinary drafts remain
excluded; `draft: true` plus `preview: true` (including string booleans) is a
directly accessible unlisted page. Search, graph membership, RSS, and sitemap
index only authored listed pages. RSS emits up to 9999 full-content items.
Historical created dates missing in source frontmatter are retained in
`plugins/site-index/baseline-dates.json`; authored dates take precedence. Build
timezone is UTC, matching the production GitHub runner.

`exograph-publishing.json` is an explicit allowlist of generated public routes
for the current profile. New folder/tag routes require a reviewed profile update
before source links to them can pass publication projection. Legacy mixed-case
routes are recorded and emitted on case-sensitive hosts; a case-insensitive
local filesystem serves the canonical file at both cases.

## Deployment setup

No network deployment is performed by this adapter. `prepare` is not Publish.
`deployment/github-pages.yml` is the reviewed-install candidate for the existing
site repository. Before enabling it, publish the engine branch to the Quartz
fork, review its commit, install the workflow on the site repository, and replace
the legacy main-push deployment only as part of an approved cutover. Preserve the
old deployed revision for rollback.

An explicit Publish operation must commit only the approved snapshot to a
dedicated site-repository branch under `publication/`, then dispatch that
workflow with the exact snapshot and engine commit SHAs. It must report
deployment setup required until the workflow is installed, and report success
only after the Pages deployment succeeds. Neither the branch upload nor
workflow installation/dispatch has occurred in this local implementation.

### Explicit deployment adapter

After the workflow has been reviewed and installed as
`.github/workflows/exograph-publish.yml`, Exograph's Publish action may invoke:

```sh
node scripts/exograph-deploy.mjs --input /absolute/reviewed-snapshot \
  --snapshot-hash SHA256 --engine-commit FULL_COMMIT_SHA \
  --site-url https://kenneth.computer
```

The snapshot hash is SHA-256 of UTF-8 `JSON.stringify(files)`, without a newline,
where `files` is the globally path-sorted array of `{path, sha256}` for every
regular file in the snapshot. Paths use `/`; sorting uses JavaScript lexical
comparison, not locale rules. Symlinks and Git metadata are rejected.

The destination is fixed by the trusted site's `deployment` profile; callers
cannot supply a different repository or workflow. The adapter verifies the
clean engine checkout, exact local/remote engine commit, unchanged snapshot,
and byte-identical installed workflow before uploading anything. Missing setup
returns exit 2 with `status: "setup-required"`.

On an explicit invocation with valid setup it creates an isolated orphan Git
commit containing only `publication/`, pushes a unique `publication/*` branch,
and dispatches the reviewed workflow with exact engine/snapshot commit SHAs.
It identifies the run by its unique snapshot/engine title, waits for completion,
and validates the Pages receipt artifact before returning `status: "deployed"`.
A failed run, mismatched receipt, or timeout cannot return deployment success.
Stopping the local wait does not cancel a dispatched GitHub workflow; inspect
that run before retrying. Saving or editing notes never invokes deployment.

Run `node --test scripts/exograph-deploy.test.mjs` for fake-GitHub/local-Git
coverage. These tests never make a network mutation.
