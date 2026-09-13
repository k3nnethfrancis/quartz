import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import os from "node:os"
import path from "node:path"
import { deploySnapshot } from "./deploy.mjs"
import { snapshotFiles, snapshotHash } from "./snapshot.mjs"

const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } })
async function fixture(mode = "success") {
  const root = await mkdtemp(path.join(os.tmpdir(), "deploy-adapter-test-"))
  const engineDirectory = path.join(root, "engine"), input = path.join(root, "input")
  await mkdir(path.join(engineDirectory, "deployment"), { recursive: true })
  await mkdir(input)
  await writeFile(path.join(input, "index.md"), "# Reviewed snapshot\n")
  await writeFile(path.join(input, "image.png"), Buffer.from([0, 255, 0, 128, 10]))
  const workflow = "name: Reviewed workflow fixture\n"
  await writeFile(path.join(engineDirectory, "deployment/github-pages.yml"), workflow)
  await writeFile(path.join(engineDirectory, "exograph-publishing.json"), JSON.stringify({ deployment: { repository: "owner/site", engineRepository: "owner/engine", workflow: "exograph-publish.yml", workflowRef: "main", siteUrl: "https://example.com" } }))
  git(engineDirectory, ["init", "--quiet"])
  git(engineDirectory, ["add", "."])
  git(engineDirectory, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture"])
  const engineCommit = git(engineDirectory, ["rev-parse", "HEAD"]).trim()
  const options = { input, engineDirectory, engineCommit, siteUrl: "https://example.com", snapshotHash: snapshotHash(await snapshotFiles(input)) }
  const calls = []
  let snapshotCommit, clock = 0, lists = 0, statuses = 0
  async function run(file, args, cwd) {
    calls.push({ file, args })
    if (file === "git") {
      if (args.includes("push")) {
        snapshotCommit = git(cwd, ["rev-parse", "HEAD"]).trim()
        assert.deepEqual(git(cwd, ["ls-tree", "-r", "--name-only", "HEAD"]).trim().split("\n"), ["publication/image.png", "publication/index.md"])
        const blob = execFileSync("git", ["show", "HEAD:publication/image.png"], { cwd })
        assert.deepEqual(blob, await readFile(path.join(input, "image.png")))
        assert.ok(args.at(-1).startsWith("HEAD:refs/heads/publication/"))
        return ""
      }
      return git(cwd, args)
    }
    assert.equal(file, "gh")
    if (args[0] === "workflow") {
      assert.ok(args.includes(`snapshot_commit=${snapshotCommit}`))
      assert.ok(args.includes(`engine_commit=${engineCommit}`))
      return ""
    }
    if (args[0] === "run") {
      assert.equal(args[2], "42", "never download an unrelated latest run")
      const dir = args[args.indexOf("--dir") + 1]
      await writeFile(path.join(dir, "deployment.json"), JSON.stringify({ snapshotCommit, engineCommit, runId: "42", deploymentUrl: mode === "wrong-receipt" ? "https://other.example" : "https://example.com/" }))
      return ""
    }
    const endpoint = args[1]
    if (endpoint === "repos/owner/site/actions/workflows/exograph-publish.yml") {
      if (mode === "missing") throw Object.assign(new Error("Missing"), { notFound: true })
      return JSON.stringify({ id: 7, state: "active" })
    }
    if (endpoint.includes("/contents/")) return JSON.stringify({ type: "file", encoding: "base64", content: Buffer.from(mode === "wrong-workflow" ? "other" : workflow).toString("base64") })
    if (endpoint.includes("/commits/")) return JSON.stringify({ sha: engineCommit })
    if (endpoint.includes("/workflows/7/runs?")) {
      lists++
      const unrelated = { id: 999, display_title: "Another user's deployment", event: "workflow_dispatch", head_branch: "main" }
      return JSON.stringify({ workflow_runs: lists === 1 ? [unrelated] : [unrelated, { id: 42, display_title: `Publish ${snapshotCommit} with ${engineCommit}`, event: "workflow_dispatch", head_branch: "main" }] })
    }
    if (endpoint.endsWith("/runs/42")) {
      statuses++
      return JSON.stringify(statuses === 1 ? { status: "in_progress" } : { status: "completed", conclusion: mode === "failed-run" ? "failure" : "success" })
    }
    throw new Error(`Unexpected fake command: ${args.join(" ")}`)
  }
  return { options, calls, dependencies: { run, now: () => clock, sleep: async ms => { clock += ms } } }
}

test("missing or changed workflow blocks before snapshot upload", async () => {
  for (const mode of ["missing", "wrong-workflow"]) {
    const f = await fixture(mode)
    const result = await deploySnapshot(f.options, f.dependencies)
    assert.equal(result.status, "setup-required")
    assert.equal(f.calls.some(call => call.args.includes("push") || call.args[0] === "workflow"), false)
  }
})

test("changed input and dirty engine fail before remote calls", async () => {
  const f = await fixture()
  await writeFile(path.join(f.options.input, "extra.md"), "not reviewed")
  await assert.rejects(deploySnapshot(f.options, f.dependencies), /snapshot changed/)
  assert.equal(f.calls.some(call => call.file === "gh"), false)
  const dirty = await fixture()
  await writeFile(path.join(dirty.options.engineDirectory, "unreviewed"), "change")
  await assert.rejects(deploySnapshot(dirty.options, dirty.dependencies), /uncommitted changes/)
  assert.equal(dirty.calls.some(call => call.file === "gh"), false)
})

test("only sanitized orphan snapshot is uploaded, exact run and deployment receipt establish success", async () => {
  const f = await fixture()
  const result = await deploySnapshot(f.options, f.dependencies)
  assert.equal(result.status, "deployed")
  assert.equal(result.runId, "42")
  assert.equal(result.deploymentUrl, "https://example.com/")
  assert.equal(result.engineCommit, f.options.engineCommit)
  assert.equal(f.calls.filter(call => call.args.includes("push")).length, 1)
})

test("failed run or mismatched receipt cannot report deployment success", async () => {
  for (const mode of ["failed-run", "wrong-receipt"]) {
    const f = await fixture(mode)
    await assert.rejects(deploySnapshot(f.options, f.dependencies), /without success|receipt does not match/)
  }
})

test("snapshot digest uses globally sorted paths rather than directory traversal order", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "snapshot-order-"))
  await mkdir(path.join(root, "a"))
  await writeFile(path.join(root, "a/b.md"), "nested")
  await writeFile(path.join(root, "a.md"), "sibling")
  assert.deepEqual((await snapshotFiles(root)).map(file => file.path), ["a.md", "a/b.md"])
})
