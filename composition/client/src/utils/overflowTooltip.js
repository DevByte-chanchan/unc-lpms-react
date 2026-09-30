const TOOLTIP_EDGE_GAP = 12
const TOOLTIP_TARGET_GAP = 8
const TOOLTIP_MAX_WIDTH = 320
const TOOLTIP_ESTIMATED_HEIGHT = 92

export const isOverflowTooltipTarget = (element, style) => {
  if (!element || style?.textOverflow !== 'ellipsis') return false

  const horizontalOverflow = Number(element.scrollWidth) > Number(element.clientWidth) + 1
  const verticalOverflow = Number(element.scrollHeight) > Number(element.clientHeight) + 1
  return horizontalOverflow || verticalOverflow
}

export const getOverflowTooltipText = (element) => {
  if (!element) return ''

  return [
    element.getAttribute?.('data-full-text'),
    element.getAttribute?.('title'),
    element.getAttribute?.('aria-label'),
    element.textContent,
  ].map(value => String(value || '').trim()).find(Boolean) || ''
}

export const getOverflowTooltipPlacement = (rect, viewport) => {
  const availableWidth = Math.max(0, Number(viewport?.width) - (TOOLTIP_EDGE_GAP * 2))
  const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, availableWidth)
  const left = Math.max(
    TOOLTIP_EDGE_GAP,
    Math.min(Number(rect?.left) || 0, Number(viewport?.width) - tooltipWidth - TOOLTIP_EDGE_GAP),
  )
  const showAbove = Number(rect?.bottom) + TOOLTIP_TARGET_GAP + TOOLTIP_ESTIMATED_HEIGHT > Number(viewport?.height)

  return showAbove
    ? { left, top: null, bottom: Number(viewport?.height) - Number(rect?.top) + TOOLTIP_TARGET_GAP }
    : { left, top: Number(rect?.bottom) + TOOLTIP_TARGET_GAP, bottom: null }
}
