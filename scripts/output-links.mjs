import { readFile, writeFile, readdir, access } from "node:fs/promises"
import path from "node:path"
import { fromHtml } from "hast-util-from-html"
import { toHtml } from "hast-util-to-html"

// Generated breadcrumbs/tags can refer to folders represented only by unlisted pages.
// Keep their authored labels readable without manufacturing a public listing.
export async function repairOutputLinks(root, siteUrl) {
  const diagnostics = []
  const site = new URL(siteUrl)
  async function exists(file) { try { await access(file); return true } catch { return false } }
  async function visitDirectory(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) { await visitDirectory(file); continue }
      if (!entry.name.endsWith(".html")) continue
      const relative = path.relative(root, file).split(path.sep).join("/")
      const tree = fromHtml(await readFile(file, "utf8"))
      let changed = false
      async function walk(node) {
        if (!node.children) return
        for (let index = 0; index < node.children.length; index++) {
          const child = node.children[index]
          await walk(child)
          if (child.siteMissingTitle) {
            if (child.tagName === "li" && child.properties?.className?.includes("section-li")) {
              node.children.splice(index--, 1)
              changed = true
              continue
            }
            node.siteMissingTitle = true
          }
          if (child.tagName !== "a" || typeof child.properties?.href !== "string") continue
          const href = child.properties.href
          if (href.startsWith("#") || /^(mailto:|tel:|data:|javascript:)/i.test(href)) continue
          let url
          try { url = new URL(href, new URL(relative, site.href.replace(/\/?$/, "/"))) } catch { continue }
          if (url.origin !== site.origin) continue
          const base = site.pathname.replace(/\/$/, "")
          if (base && !url.pathname.startsWith(base + "/")) continue
          const pathname = decodeURIComponent(url.pathname.slice(base.length)).replace(/^\//, "")
          const target = path.resolve(root, pathname)
          if (target !== root && !target.startsWith(root + path.sep)) continue
          const valid = await exists(target + ".html") || await exists(path.join(target, "index.html")) || (path.extname(target) && await exists(target))
          if (valid) {
            if (href.includes("/./")) { child.properties.href = url.pathname + url.search + url.hash; changed = true }
            continue
          }
          diagnostics.push({ page: relative, href, reason: "No published target" })
          node.children.splice(index, 1, ...(child.children ?? []))
          if (node.tagName === "h3") node.siteMissingTitle = true
          changed = true
        }
        if (node.properties?.className?.includes("page-listing")) {
          let count = 0
          const countRows = (item) => { if (item.tagName === "li" && item.properties?.className?.includes("section-li")) count++; for (const nested of item.children ?? []) countRows(nested) }
          countRows(node)
          const summary = node.children.find(item => item.tagName === "p")
          if (summary?.children?.some(item => item.type === "text" && /items under this folder/.test(item.value))) summary.children = [{ type: "text", value: `${count} items under this folder.` }]
        }
      }
      await walk(tree)
      if (changed) await writeFile(file, toHtml(tree, { allowDangerousHtml: true }))
    }
  }
  await visitDirectory(root)
  return diagnostics
}
