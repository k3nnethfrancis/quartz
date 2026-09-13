import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, writeFile, readFile, access, symlink } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { legacySlug } from "./legacy-routes.mjs"
const adapter = fileURLToPath(new URL("./exograph-publish.mjs", import.meta.url))
const run = (input, output, extra = []) => spawnSync(process.execPath, [adapter, "--input", input, "--output", output, "--site-url", "https://example.com", "--action", "preview", ...extra], { encoding: "utf8", timeout: 90000 })

test("legacy slugs retain v4 case and punctuation rules", () => {
  assert.equal(legacySlug("Folder/My Note & More.md"), "Folder/My-Note--and--More")
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
  assert.ok(manifest.aliases.some(alias => alias.from === "Public" && alias.to === "public"))
  assert.notEqual(run(input, output).status, 0, "must reject stale output")
  await symlink(path.join(input, "index.md"), path.join(input, "linked.md"))
  assert.notEqual(run(input, path.join(root, "symlink-output")).status, 0)
})
