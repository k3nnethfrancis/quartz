import { h } from "preact"
import { classNames, resolveRelative } from "@quartz-community/utils"

export const ArticleImage = () => {
  const ArticleImageComponent = ({ fileData, displayClass }) => {
    const image = fileData.frontmatter?.image
    if (typeof image !== "string" || !image || !fileData.slug) return null

    const source = image.startsWith("/")
      ? resolveRelative(fileData.slug, image.slice(1))
      : image

    return h(
      "figure",
      { class: classNames(displayClass, "article-image") },
      h("img", { src: source, alt: "" }),
    )
  }

  ArticleImageComponent.css = `
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

  return ArticleImageComponent
}
