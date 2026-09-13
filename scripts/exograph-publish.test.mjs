import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, writeFile, readFile, access, symlink } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { legacySlug } from "./legacy-routes.mjs"
import { repairOutputLinks } from "./output-links.mjs"
import { validateRoutes } from "./route-preflight.mjs"
const adapter = fileURLToPath(new URL("./exograph-publish.mjs", import.meta.url))
// Set this to the desktop Electron binary to exercise the complete nested
// adapter -> Quartz CLI build with the same runtime as the app.
const executable = process.env.EXOGRAPH_TEST_NODE_EXECUTABLE || process.execPath
const run = (input, output, extra = []) => spawnSync(executable, [adapter, "--input", input, "--output", output, "--site-url", "https://example.com", "--action", "preview", ...extra], { encoding: "utf8", timeout: 90000, env: { ...process.env, ...(process.env.EXOGRAPH_TEST_NODE_EXECUTABLE ? { ELECTRON_RUN_AS_NODE: "1" } : {}) } })

test("legacy slugs retain v4 case and punctuation rules", () => {
  assert.equal(legacySlug("Folder/My Note & More.md"), "Folder/My-Note--and--More")
})

test("case, whitespace, and alias collisions fail before Quartz can overwrite a page", async () => {
  for (const [first, second, body] of [["a b.md", "a-b.md", "# First"], ["Page.md", "page.md", "# First"], ["one.md", "two.md", "---\naliases: [two]\n---\n# First"]]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "route-collision-"))
    await writeFile(path.join(root, first), body)
    await writeFile(path.join(root, second), "# Second")
    await assert.rejects(validateRoutes(root, [{ path: first }, { path: second }]), /URL collision/)
  }
})

test("unlisted-only folders disappear from generated listings and missing tags stay readable", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "publishing-links-test-"))
  await mkdir(path.join(root, "blog"))
  await writeFile(path.join(root, "blog/index.html"), '<div class="page-listing"><p>1 items under this folder.</p><ul><li class="section-li"><div><h3><a href="previews/">previews</a></h3></div></li></ul></div><a href="../tags/only-unlisted">organizations</a>')
  const diagnostics = await repairOutputLinks(root, "https://example.com")
  const html = await readFile(path.join(root, "blog/index.html"), "utf8")
  assert.doesNotMatch(html, /previews|href=/)
  assert.match(html, /0 items under this folder/)
  assert.match(html, /organizations/)
  assert.equal(diagnostics.length, 2)
})

test("real build preserves public/unlisted boundaries and emits a single receipt", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "publishing-adapter-test-"))
  const input = path.join(root, "input"), output = path.join(root, "output")
  await mkdir(input)
  await writeFile(path.join(input, "index.md"), "---\ntitle: Home\ncreated: 2026-01-01\n---\n# Home\n**Full RSS body**\n")
  await writeFile(path.join(input, "Public.md"), "---\ntitle: Public\ncreated: 2026-01-02\naliases: [Old Public]\n---\n# Public\n")
  await writeFile(path.join(input, "preview.md"), '---\ntitle: Shared preview\ndraft: "true"\npreview: "true"\n---\n# Shared preview\n')
  await writeFile(path.join(input, "private.md"), '---\ntitle: PRIVATE-CANARY\ndraft: "true"\n---\nPRIVATE-CANARY\n')
  const result = run(input, output)
  assert.equal(result.status, 0, result.stderr)
  const receipt = JSON.parse(result.stdout)
  assert.equal(receipt.ok, true)
  await access(path.join(output, "preview.html"))
  await assert.rejects(access(path.join(output, "private.html")))
  const index = JSON.parse(await readFile(path.join(output, "static/contentIndex.json"), "utf8"))
  assert.deepEqual(Object.keys(index).sort(), ["index", "public"])
  const feed = await readFile(path.join(output, "index.xml"), "utf8")
  assert.equal((feed.match(/<item>/g) ?? []).length, 2)
  assert.match(feed, /Full RSS body/)
  assert.doesNotMatch(feed, /PRIVATE-CANARY|Shared preview/)
  const manifest = JSON.parse(await readFile(receipt.manifestPath, "utf8"))
  assert.equal(manifest.deployment.status, "not-deployed")
  const clientScripts = await Promise.all(manifest.outputFiles.filter(file => file.path.endsWith(".js")).map(file => readFile(path.join(output, file.path), "utf8")))
  assert.equal(clientScripts.filter(script => script.includes("[Explorer] Nav event received")).length, 1, "Explorer must initialize once; duplicate scripts toggle the menu twice per click")
  assert.ok(manifest.aliases.some(alias => alias.from === "Public" && alias.to === "public"))
  assert.notEqual(run(input, output).status, 0, "must reject stale output")
  await symlink(path.join(input, "index.md"), path.join(input, "linked.md"))
  assert.notEqual(run(input, path.join(root, "symlink-output")).status, 0)
})
