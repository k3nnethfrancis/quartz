import { FullSlug, resolveRelative } from "../util/path"
import { classNames } from "../util/lang"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const ArticleImage: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const image = fileData.frontmatter?.image
  if (!image || !fileData.slug) return null

  const source = image.startsWith("/")
    ? resolveRelative(fileData.slug, image.slice(1) as FullSlug)
    : image

  return (
    <figure class={classNames(displayClass, "article-image")}> 
      <img src={source} alt="" />
    </figure>
  )
}

ArticleImage.css = `
.article-image {
  margin: 1.25rem 0 1.5rem;
}

.article-image img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 10px;
}
`

export default (() => ArticleImage) satisfies QuartzComponentConstructor
