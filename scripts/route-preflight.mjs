import { readFile } from "node:fs/promises"
import path from "node:path"
import YAML from "yaml"
import { slugifyFilePath } from "@quartz-community/utils"

export async function validateRoutes(input, files) {
  const routes = new Map()
  const register = (route, source) => {
    const normalized = route.replace(/\/index(?:\.html)?$/, "").replace(/\.html$/, "")
    const owner = routes.get(normalized)
    if (owner && owner !== source) throw new Error(`Publication URL collision: ${owner} and ${source}`)
    routes.set(normalized, source)
  }
  const notes = []
  for (const file of files) {
    if (!file.path.endsWith(".md")) {
      if (["index.xml", "sitemap.xml", "static/contentIndex.json"].includes(file.path)) throw new Error(`Asset conflicts with a generated publication file: ${file.path}`)
      register(slugifyFilePath(file.path), file.path)
      continue
    }
    const text = await readFile(path.join(input, file.path), "utf8")
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
    const frontmatter = match ? YAML.parse(match[1]) ?? {} : {}
    const isTrue = value => value === true || value === "true"
    if (isTrue(frontmatter.draft) && !isTrue(frontmatter.preview)) continue
    register(slugifyFilePath(file.path), file.path)
    notes.push({ file, frontmatter })
  }
  for (const { file, frontmatter } of notes) {
    const value = frontmatter.aliases ?? frontmatter.alias ?? []
    for (const alias of Array.isArray(value) ? value : [value]) {
      if (typeof alias !== "string") continue
      const relative = path.posix.join(path.posix.dirname(file.path), alias)
      if (relative.startsWith("../") || relative.startsWith("/")) throw new Error(`Publication alias escapes its site: ${file.path}`)
      register(slugifyFilePath(relative), file.path)
    }
  }
}
