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

## Deployment ownership

Exograph owns the destination setting, incremental publication branch, workflow
installation checks, upload, dispatch, and deployment receipts. This engine
contains no deployment command or fixed destination profile. Its only publishing
extension is the optional build hook described above.

The site repository contains sanitized `garden/` content, the reviewed Pages
workflow, and Exograph's shared Quartz runner. An explicit Publish action advances
one `publication` branch with a normal commit and dispatches the exact snapshot
and engine revisions. No vault Git history is imported. Saving notes does not
deploy, and stopping the local wait cannot cancel an already dispatched workflow.

For responsive layout regression, import `scripts/mobile-layout-check.mjs` in a
browser session and call `checkMobileLayout(tab)` on the home, blog listing and
an article at 355px and 390px, with the menu both closed and open. It asserts
aligned controls, no horizontal overflow, non-overlapping listing dates/titles,
and no rendered links in the closed drawer. Also exercise search navigation
and the theme toggle before repeating it; desktop lists retain their columns.
