import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

const config = await loadQuartzConfig()
// The publishing adapter supplies only deployment metadata, never executable config.
if (process.env.EXOGRAPH_PUBLISH_SITE_URL) {
  const url = new URL(process.env.EXOGRAPH_PUBLISH_SITE_URL)
  config.configuration.baseUrl = `${url.host}${url.pathname.replace(/\/$/, "")}`
}
if (process.env.EXOGRAPH_PUBLISH_ACTION === "preview") config.configuration.analytics = null
export default config
export const layout = await loadQuartzLayout()
