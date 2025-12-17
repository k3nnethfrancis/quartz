import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

const HeaderImage: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const image = fileData.frontmatter?.image
  const title = fileData.frontmatter?.title || "Header image"

  if (image) {
    const baseDir = pathToRoot(fileData.slug!)
    // Handle both absolute and relative image paths
    const imageSrc = image.startsWith("/") ? baseDir + image : image
    return <img src={imageSrc} alt={title} class="header-image" />
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
