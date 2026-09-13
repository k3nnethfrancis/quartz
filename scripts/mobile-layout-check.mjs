import assert from "node:assert/strict"

// Run against a real loaded browser tab at a mobile viewport. The caller owns
// navigation, resizing and menu interactions; this checks rendered geometry.
export async function checkMobileLayout(tab) {
  const result = await tab.playwright.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.sidebar.left button'))
      .map(button => ({ label: button.getAttribute('aria-label'), rect: button.getBoundingClientRect() }))
      .filter(button => button.rect.height > 0)
    const centers = buttons.map(button => button.rect.top + button.rect.height / 2)
    const drawer = document.querySelector('.explorer-content')
    const collapsed = document.querySelector('.explorer')?.classList.contains('collapsed')
    const rows = Array.from(document.querySelectorAll('.page-listing .section')).map(row => {
      const date = row.querySelector('.meta')?.getBoundingClientRect()
      const title = row.querySelector('.desc')?.getBoundingClientRect()
      return !date || !title || date.bottom <= title.top
    })
    return {
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      centers,
      rows,
      collapsed,
      hiddenDrawer: !drawer || getComputedStyle(drawer).display === 'none',
      visibleDrawerLinks: drawer ? Array.from(drawer.querySelectorAll('a')).filter(a => a.getBoundingClientRect().height > 0).length : 0,
    }
  })
  assert.ok(result.width <= 800, 'Run this check at a mobile viewport')
  assert.ok(result.scrollWidth <= result.width + 1, 'Page must not scroll horizontally')
  assert.ok(result.centers.length >= 4, 'Expected menu and toolbar controls')
  assert.ok(Math.max(...result.centers) - Math.min(...result.centers) <= 2, 'Toolbar controls must share one vertical center')
  assert.ok(result.rows.every(Boolean), 'Listing dates must sit above titles without overlap')
  if (result.collapsed) {
    assert.ok(result.hiddenDrawer, 'Closed drawer must be removed from layout and focus navigation')
    assert.equal(result.visibleDrawerLinks, 0)
  }
  return result
}
