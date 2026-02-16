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
