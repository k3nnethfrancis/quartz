import { readFile, writeFile, mkdir, lstat } from "node:fs/promises"
import path from "node:path"
import YAML from "yaml"
import { slugifyFilePath } from "@quartz-community/utils"

export const legacySlug = (file) => file.replace(/\.md$/, "").split("/").map(segment => segment.replace(/\s/g, "-").replace(/&/g, "-and-").replace(/%/g, "-percent").replace(/[?#]/g, "")).join("/").replace(/_index$/, "index")
const safe = (slug) => !slug.startsWith("/") && !slug.split("/").some(segment => [".", "..", ""].includes(segment)) && !/[<>:"|*\\]/.test(slug)
const escape = (text) => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")

export async function preserveLegacyRoutes(input, output, files) {
  const aliases = []
  for (const file of files.filter(file => file.path.endsWith(".md"))) {
    const target = slugifyFilePath(file.path)
    const targetPath = path.join(output, target + ".html")
    let targetStat
    try { targetStat = await lstat(targetPath) } catch { continue } // excluded drafts have no route
    const text = await readFile(path.join(input, file.path), "utf8")
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
    const values = frontmatter ? YAML.parse(frontmatter[1]) : {}
    const authored = values?.aliases ?? values?.alias ?? []
    const routes = [legacySlug(file.path), ...(Array.isArray(authored) ? authored : [authored]).filter(value => typeof value === "string").map(alias => legacySlug(path.posix.join(path.posix.dirname(file.path), alias)))]
    for (const route of routes) {
      if (route === target || !safe(route)) continue
      const aliasPath = path.join(output, route + ".html")
      let existing
      try { existing = await lstat(aliasPath) } catch {}
      if (existing && existing.ino !== targetStat.ino) continue // never overwrite a real route
      aliases.push({ from: route, to: target })
      if (existing) continue // case-insensitive host; Linux build emits the separate alias
      await mkdir(path.dirname(aliasPath), { recursive: true })
      const relative = path.posix.relative(path.posix.dirname(route), target).split("/").map(encodeURIComponent).join("/")
      await writeFile(aliasPath, `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escape(relative)}"><link rel="canonical" href="${escape(relative)}"><a href="${escape(relative)}">Continue</a>`)
    }
  }
  return aliases
}
