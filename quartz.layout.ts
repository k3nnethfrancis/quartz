import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { FileTrieNode } from "./quartz/util/fileTrie"

// Sort by date (newest first), folders first, then alphabetical fallback
const sortByDate = (a: FileTrieNode, b: FileTrieNode) => {
  // Folders first
  if (a.isFolder && !b.isFolder) return -1
  if (!a.isFolder && b.isFolder) return 1

  // Both files or both folders: sort by date (descending)
  // Date is serialized as ISO string in contentIndex.json
  const aDate = a.data?.date ? new Date(a.data.date as unknown as string).getTime() : 0
  const bDate = b.data?.date ? new Date(b.data.date as unknown as string).getTime() : 0
  if (aDate !== bDate) return bDate - aDate

  // Fallback to alphabetical
  return a.displayName.localeCompare(b.displayName, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {},
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.TagList(),
      condition: (page) => page.fileData.slug !== "index",
    }),
  ],
  left: [
    Component.DesktopOnly(Component.PageTitle()),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.ConditionalRender({
      component: Component.Explorer({ folderDefaultState: "collapsed", sortFn: sortByDate }),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.Explorer({ sortFn: sortByDate }),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.DesktopOnly(
        Component.RecentNotes({
          title: "Recent Logs",
          limit: 3,
          showTags: false,
          linkToMore: "research/logs/" as any,
          filter: (f) => f.slug?.startsWith("research/logs/") && !f.slug?.endsWith("/index"),
        }),
      ),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.DesktopOnly(
        Component.RecentNotes({
          title: "Recent Notes",
          limit: 3,
          showTags: false,
          linkToMore: "research/notes/" as any,
          filter: (f) => f.slug?.startsWith("research/notes/") && !f.slug?.endsWith("/index"),
          sort: (a, b) => {
            const aDate = a.frontmatter?.modified ?? a.frontmatter?.created ?? ""
            const bDate = b.frontmatter?.modified ?? b.frontmatter?.created ?? ""
            return bDate.localeCompare(aDate) // descending (newest first)
          },
        }),
      ),
      condition: (page) => page.fileData.slug === "index",
    }),
  ],
  right: [
    Component.Graph(),
    Component.ConditionalRender({
      component: Component.DesktopOnly(Component.TableOfContents()),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.Backlinks(),
      condition: (page) => page.fileData.slug !== "index",
    }),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.DesktopOnly(Component.PageTitle()),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({ sortFn: sortByDate }),
  ],
  right: [],
}
