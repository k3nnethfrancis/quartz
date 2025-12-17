import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const HeaderImage: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const image = fileData.frontmatter?.image
  const title = fileData.frontmatter?.title || "Header image"

  if (image) {
    return <img src={image} alt={title} class="header-image" />
  } else {
    return null
  }
}

HeaderImage.css = `
.header-image {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  object-position: bottom;
  margin-bottom: 2rem;
  border: 1px solid var(--dark);
}
`

export default (() => HeaderImage) satisfies QuartzComponentConstructor
