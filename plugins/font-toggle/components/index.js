import { h } from "preact"
import { classNames } from "@quartz-community/utils"

const fontToggleScript = `
const currentFont = localStorage.getItem("font") ?? "coder"
document.documentElement.setAttribute("saved-font", currentFont)

document.addEventListener("nav", () => {
  const switchFont = () => {
    const current = document.documentElement.getAttribute("saved-font")
    const newFont = current === "coder" ? "reader" : "coder"
    document.documentElement.setAttribute("saved-font", newFont)
    localStorage.setItem("font", newFont)
  }

  for (const fontButton of document.getElementsByClassName("font-toggle")) {
    fontButton.addEventListener("click", switchFont)
    window.addCleanup(() => fontButton.removeEventListener("click", switchFont))
  }
})
`

export const FontToggle = () => {
  const FontToggleComponent = ({ displayClass }) =>
    h(
      "button",
      { class: classNames(displayClass, "font-toggle"), "aria-label": "Toggle font" },
      h(
        "svg",
        {
          class: "mono-icon",
          xmlns: "http://www.w3.org/2000/svg",
          width: "20",
          height: "20",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        h("polyline", { points: "4 7 4 4 20 4 20 7" }),
        h("line", { x1: "9", y1: "20", x2: "15", y2: "20" }),
        h("line", { x1: "12", y1: "4", x2: "12", y2: "20" }),
      ),
      h(
        "svg",
        {
          class: "serif-icon",
          xmlns: "http://www.w3.org/2000/svg",
          width: "20",
          height: "20",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        h("polyline", { points: "16 18 22 12 16 6" }),
        h("polyline", { points: "8 6 2 12 8 18" }),
      ),
    )

  FontToggleComponent.beforeDOMLoaded = fontToggleScript
  FontToggleComponent.css = `
.font-toggle {
  cursor: pointer;
  padding: 0;
  position: relative;
  background: none;
  border: none;
  width: 20px;
  height: 20px;
  margin: 0;
  text-align: inherit;
  flex-shrink: 0;
}

.font-toggle svg {
  position: absolute;
  width: 20px;
  height: 20px;
  top: calc(50% - 10px);
  stroke: var(--darkgray);
  transition: opacity 0.1s ease;
}

:root .font-toggle > .mono-icon { display: inline; }
:root .font-toggle > .serif-icon { display: none; }
:root[saved-font="reader"] .font-toggle > .mono-icon { display: none; }
:root[saved-font="reader"] .font-toggle > .serif-icon { display: inline; }
:root[saved-font="reader"] {
  --bodyFont: "Libre Baskerville", Baskerville, Georgia, serif;
  --headerFont: "Libre Baskerville", Baskerville, Georgia, serif;
}
`

  return FontToggleComponent
}
