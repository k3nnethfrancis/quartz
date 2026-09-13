import { h } from "preact"
import { formatDate, getDate, resolveRelative } from "@quartz-community/utils"

const recentNotesCss = `
.recent-notes > h3 {
  margin: 0.5rem 0 0;
  font-size: 1rem;
}

.recent-notes > ul.recent-ul {
  list-style: none;
  margin-top: 1rem;
  padding-left: 0;
}

.recent-notes > ul.recent-ul > li {
  margin: 1rem 0;
}

.recent-notes > ul.recent-ul > li .section > .desc > h3 > a {
  background-color: transparent;
}

.recent-notes > ul.recent-ul > li .section > .meta {
  margin: 0 0 0.5rem;
  opacity: 0.6;
}
`

const dateValue = (page, sortBy) => {
  if (sortBy && page.dates?.[sortBy]) return page.dates[sortBy]
  return getDate(page)
}

export const RecentNotes = (userOpts = {}) => {
  const RecentNotesComponent = ({ allFiles, fileData, cfg, displayClass }) => {
    const options = userOpts
    const prefix = typeof options.prefix === "string" ? options.prefix.replace(/^\/+|\/+$/g, "") : ""
    const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 3
    const sortBy = options.sortBy === "modified" ? "modified" : "created"
    const pages = allFiles
      .filter((page) => {
        const slug = String(page.slug ?? "")
        return (
          slug.startsWith(`${prefix}/`) &&
          !slug.endsWith("/index") &&
          page.unlisted !== true &&
          page.frontmatter?.draft !== true
        )
      })
      .sort((a, b) => {
        const aDate = dateValue(a, sortBy)
        const bDate = dateValue(b, sortBy)
        if (aDate && bDate) return new Date(bDate).getTime() - new Date(aDate).getTime()
        if (aDate) return -1
        if (bDate) return 1
        const aTitle = String(a.frontmatter?.title ?? a.slug ?? "").toLowerCase()
        const bTitle = String(b.frontmatter?.title ?? b.slug ?? "").toLowerCase()
        return aTitle.localeCompare(bTitle)
      })

    const remaining = Math.max(0, pages.length - limit)
    const title = options.title ?? "Recent Notes"
    const linkToMore = options.linkToMore
    const showTags = options.showTags === true

    return h(
      "div",
      { class: [displayClass, "recent-notes"].filter(Boolean).join(" ") },
      h("h3", null, title),
      h(
        "ul",
        { class: "recent-ul" },
        pages.slice(0, limit).map((page) => {
          const pageTitle = page.frontmatter?.title ?? page.slug ?? "Untitled"
          const date = getDate(page)
          const tags = Array.isArray(page.frontmatter?.tags) ? page.frontmatter.tags : []
          return h(
            "li",
            { class: "recent-li", key: page.slug },
            h(
              "div",
              { class: "section" },
              h(
                "div",
                { class: "desc" },
                h(
                  "h3",
                  null,
                  h(
                    "a",
                    { href: resolveRelative(fileData.slug, page.slug), class: "internal" },
                    pageTitle,
                  ),
                ),
              ),
              date && h("p", { class: "meta" }, formatDate(new Date(date), cfg.locale)),
              showTags &&
                h(
                  "ul",
                  { class: "tags" },
                  tags.map((tag) =>
                    h(
                      "li",
                      { key: tag },
                      h(
                        "a",
                        {
                          class: "internal tag-link",
                          href: resolveRelative(fileData.slug, `tags/${tag}`),
                        },
                        tag,
                      ),
                    ),
                  ),
                ),
            ),
          )
        }),
      ),
      linkToMore &&
        remaining > 0 &&
        h(
          "p",
          null,
          h("a", { href: resolveRelative(fileData.slug, linkToMore) }, `See ${remaining} more →`),
        ),
    )
  }

  RecentNotesComponent.css = recentNotesCss
  return RecentNotesComponent
}
