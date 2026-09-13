#!/usr/bin/env node
import { parseArgs } from "node:util"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { deploySnapshot } from "./deploy.mjs"

try {
  const { values } = parseArgs({ options: Object.fromEntries(["input", "snapshot-hash", "engine-commit", "site-url"].map(key => [key, { type: "string" }])) })
  const result = await deploySnapshot({ input: values.input, snapshotHash: values["snapshot-hash"], engineCommit: values["engine-commit"], siteUrl: values["site-url"], engineDirectory: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") })
  process.stdout.write(JSON.stringify(result) + "\n")
  if (!result.ok) process.exitCode = result.status === "setup-required" ? 2 : 1
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, status: "failed", message: error.message, ...(error.snapshotCommit ? { snapshotCommit: error.snapshotCommit } : {}), ...(error.runId ? { runId: error.runId } : {}) }) + "\n")
  process.exitCode = 1
}
