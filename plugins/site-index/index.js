import { ContentIndex } from "@quartz-community/content-index"
import dates from "./baseline-dates.json" with { type: "json" }

// v4 indexed authored pages, not synthetic tag/folder landing pages.
export const SiteIndex = (options) => {
  const index = ContentIndex(options)
  const authored = (content) => content.filter(([, file]) => file.data.siteAuthored === true)
  return {
    ...index,
    name: "SiteIndex",
    htmlPlugins() {
      return [() => (_tree, file) => {
        file.data.siteAuthored = true
        const slug = file.data.slug.replace(/\/index$/, "")
        const frontmatter = file.data.frontmatter ?? {}
        if (!frontmatter.created && !frontmatter.date && dates[slug]) {
          file.data.dates = { ...file.data.dates, created: new Date(dates[slug]) }
        }
      }]
    },
    emit: (ctx, content) => index.emit(ctx, authored(content)),
    partialEmit: (ctx, content, ...rest) => index.partialEmit(ctx, authored(content), ...rest),
  }
}
export default SiteIndex
