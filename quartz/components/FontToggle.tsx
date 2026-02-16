// @ts-ignore
import fontToggleScript from "./scripts/fonttoggle.inline"
import styles from "./styles/fonttoggle.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const FontToggle: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <button class={classNames(displayClass, "font-toggle")} aria-label="Toggle font">
      {/* Shown in coder mode: T icon (click to switch to reader) */}
      <svg
        class="mono-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="4 7 4 4 20 4 20 7"></polyline>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
      </svg>
      {/* Shown in reader mode: </> code bracket (click to switch to coder) */}
      <svg
        class="serif-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    </button>
  )
}

FontToggle.beforeDOMLoaded = fontToggleScript
FontToggle.css = styles

export default (() => FontToggle) satisfies QuartzComponentConstructor
