#!/usr/bin/env node
import { createHash } from "node:crypto"
import { spawn, execFileSync } from "node:child_process"
import { lstat, readdir, readFile, mkdir, mkdtemp, writeFile, rename, rm, realpath } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { validateRoutes } from "./route-preflight.mjs"
import { repairOutputLinks } from "./output-links.mjs"
import { preserveLegacyRoutes } from "./legacy-routes.mjs"

const engine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const within = (parent, child) => child === parent || child.startsWith(parent + path.sep)

async function manifest(root) {
  const files = []
  async function visit(dir) {
    for (const entry of (await readdir(dir)).sort()) {
      const absolute = path.join(dir, entry)
      const stat = await lstat(absolute)
      if (stat.isSymbolicLink()) throw new Error("Publication snapshots must not contain symlinks")
      if (stat.isDirectory()) await visit(absolute)
      else if (stat.isFile()) files.push({ path: path.relative(root, absolute).split(path.sep).join("/"), sha256: createHash("sha256").update(await readFile(absolute)).digest("hex") })
      else throw new Error("Publication snapshots must contain only ordinary files")
    }
  }
  await visit(root)
  return files
}

let staging
try {
  const { values } = parseArgs({ options: Object.fromEntries(["input", "output", "site-url", "action"].map(key => [key, { type: "string" }])) })
  if (!values.input || !values.output || !values["site-url"] || !["preview", "prepare"].includes(values.action)) throw new Error("Required: --input DIR --output FRESH_DIR --site-url URL --action preview|prepare")
  const site = new URL(values["site-url"])
  if (!["http:", "https:"].includes(site.protocol) || site.username || site.password || site.search || site.hash) throw new Error("Site URL must be an HTTP(S) URL without credentials, query, or fragment")
  const input = await realpath(values.input)
  const requestedOutput = path.resolve(values.output)
  if (within(input, requestedOutput) || within(requestedOutput, input)) throw new Error("Output must be separate from the snapshot")
  await mkdir(path.dirname(requestedOutput), { recursive: true })
  const output = path.join(await realpath(path.dirname(requestedOutput)), path.basename(requestedOutput))
  if (within(input, output) || within(output, input) || output === engine || within(output, engine)) throw new Error("Output must be separate from the snapshot and engine")
  try {
    const stat = await lstat(output)
    if (!stat.isDirectory() || stat.isSymbolicLink() || (await readdir(output)).length) throw new Error("Output must be a fresh directory")
  } catch (error) { if (error.code !== "ENOENT") throw error }
  const before = await manifest(input)
  await validateRoutes(input, before)
  staging = await mkdtemp(path.join(path.dirname(output), ".quartz-build-"))
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(engine, "quartz/bootstrap-cli.mjs"), "build", "--directory", input, "--output", staging], { cwd: engine, env: { ...process.env, TZ: "UTC", EXOGRAPH_PUBLISH_SITE_URL: site.href, EXOGRAPH_PUBLISH_ACTION: values.action }, stdio: ["ignore", "pipe", "pipe"] })
    child.stdout.pipe(process.stderr)
    child.stderr.pipe(process.stderr)
    child.on("error", reject)
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`Quartz build failed (${code})`)))
  })
  if (JSON.stringify(before) !== JSON.stringify(await manifest(input))) throw new Error("Publication snapshot changed during build; rebuild from a fresh snapshot")
  await lstat(path.join(staging, "index.html"))
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: engine, encoding: "utf8" }).trim()
  const aliases = await preserveLegacyRoutes(input, staging, before)
  const diagnostics = await repairOutputLinks(staging, site.href)
  const receipt = { version: 1, aliases, diagnostics, action: values.action, siteUrl: site.href, engine: { name: "quartz", version: "5.0.0", revision, upstreamRevision: "f1fba3fc55cbf60a60a5d09c95a49c042cdab63a" }, files: before, outputFiles: await manifest(staging), deployment: { status: "not-deployed", reason: "Requires reviewed GitHub Pages workflow installation and explicit dispatch" } }
  const manifestPath = output + ".receipt.json"
  await writeFile(manifestPath, JSON.stringify(receipt, null, 2) + "\n")
  // An empty caller-created staging directory can be replaced atomically on POSIX.
  await rename(staging, output)
  staging = undefined
  process.stdout.write(JSON.stringify({ ok: true, action: values.action, outputPath: output, indexPath: path.join(output, "index.html"), manifestPath, engine: receipt.engine }) + "\n")
} catch (error) {
  if (staging) await rm(staging, { recursive: true, force: true })
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
}
