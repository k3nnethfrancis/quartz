const isTrue = (value) => value === true || value === "true"

const isPreview = (file) => {
  const frontmatter = file.data?.frontmatter ?? {}
  return isTrue(frontmatter.draft) && isTrue(frontmatter.preview)
}

export const PreviewPages = () => ({
  name: "PreviewPages",
  htmlPlugins() {
    return [
      () => (_tree, file) => {
        if (isPreview(file)) {
          file.data.unlisted = true
        }
      },
    ]
  },
  shouldPublish(_ctx, [_tree, file]) {
    const draft = isTrue(file.data?.frontmatter?.draft)
    if (isPreview(file)) {
      file.data.unlisted = true
      return true
    }
    return !draft
  },
})

export default PreviewPages
