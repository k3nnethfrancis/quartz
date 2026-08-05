import type { QuartzPluginData } from "../plugins/vfile"

const isTrue = (value: unknown): boolean => value === true || value === "true"
const previewRoot = "blog/previews"

/** An explicitly shared draft that should render without entering discovery indexes. */
export const isPreview = (data: Partial<QuartzPluginData>): boolean =>
  isTrue(data.frontmatter?.draft) && isTrue(data.frontmatter?.preview)

/** Preview folders stay out of folder listings even if a page inside is public. */
export const isPreviewPath = (data: { slug?: string | null }): boolean =>
  String(data.slug ?? "") === previewRoot || String(data.slug ?? "").startsWith(`${previewRoot}/`)
