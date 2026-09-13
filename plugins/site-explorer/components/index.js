import { Explorer as QuartzExplorer } from "@quartz-community/explorer"

export const Explorer = (userOpts = {}) => {
  const Component = QuartzExplorer({
    ...userOpts,
    filterFn: (node) => {
      if (
        node.slugSegment === "images" ||
        node.slugSegment === "tags" ||
        node.slugSegment === "previews"
      )
        return false
      if (!node.isFolder && node.data?.unlisted === true) return false
      return true
    },
    mapFn: (node) => {
      if (node.isFolder && typeof node.displayName === "string") {
        node.displayName = node.displayName.replace(/-/g, " ")
      }
      return node
    },
    sortFn: (a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      if (a.isFolder && b.isFolder) {
        return (a.displayName || "").localeCompare(b.displayName || "", undefined, {
          numeric: true,
          sensitivity: "base",
        })
      }
      const aDate = a.data?.date || a.data?.dates?.created || 0
      const bDate = b.data?.date || b.data?.dates?.created || 0
      const dateDifference = new Date(bDate).getTime() - new Date(aDate).getTime()
      if (dateDifference !== 0) return dateDifference
      return (a.displayName || "").localeCompare(b.displayName || "", undefined, {
        numeric: true,
        sensitivity: "base",
      })
    },
  })

  // One component registration emits one client script. Registering separate
  // homepage/article instances installs duplicate toggle handlers in Quartz 5.
  const SiteExplorer = (props) => {
    const tree = Component(props)
    tree.props["data-collapsed"] = props.fileData?.slug === "index" ? "collapsed" : "open"
    return tree
  }
  Object.assign(SiteExplorer, Component)
  return SiteExplorer
}
