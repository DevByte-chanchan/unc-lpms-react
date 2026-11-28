import { useEffect, useState } from 'react'
import styles from '../styles/OverflowTooltip.module.sass'
import {
  getOverflowTooltipPlacement,
  getOverflowTooltipText,
  isOverflowTooltipTarget,
} from '../utils/overflowTooltip.js'

const TOOLTIP_ID = 'app-overflow-tooltip'

const findOverflowTarget = (start) => {
  let element = start instanceof Element ? start : null

  while (element && element !== document.documentElement) {
    if (isOverflowTooltipTarget(element, window.getComputedStyle(element))) return element
    element = element.parentElement
  }

  return null
}

const OverflowTooltip = () => {
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    let describedElement = null
    let previousDescription = null

    const restoreDescription = () => {
      if (!describedElement) return
      if (previousDescription) describedElement.setAttribute('aria-describedby', previousDescription)
      else describedElement.removeAttribute('aria-describedby')
      describedElement = null
      previousDescription = null
    }

    const closeTooltip = () => {
      restoreDescription()
      setTooltip(null)
    }

    const openTooltip = (event) => {
      const element = findOverflowTarget(event.target)
      if (!element) {
        closeTooltip()
        return
      }

      const text = getOverflowTooltipText(element)
      if (!text) return

      restoreDescription()
      describedElement = element
      previousDescription = element.getAttribute('aria-describedby')
      element.setAttribute('aria-describedby', TOOLTIP_ID)

      setTooltip({
        text,
        ...getOverflowTooltipPlacement(element.getBoundingClientRect(), {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      })
    }

    const handlePointerOut = (event) => {
      const currentTarget = findOverflowTarget(event.target)
      if (currentTarget && event.relatedTarget && currentTarget.contains(event.relatedTarget)) return
      closeTooltip()
    }

    document.addEventListener('pointerover', openTooltip)
    document.addEventListener('pointerout', handlePointerOut)
    document.addEventListener('focusin', openTooltip)
    document.addEventListener('focusout', closeTooltip)
    window.addEventListener('scroll', closeTooltip, true)
    window.addEventListener('resize', closeTooltip)

    return () => {
      restoreDescription()
      document.removeEventListener('pointerover', openTooltip)
      document.removeEventListener('pointerout', handlePointerOut)
      document.removeEventListener('focusin', openTooltip)
      document.removeEventListener('focusout', closeTooltip)
      window.removeEventListener('scroll', closeTooltip, true)
      window.removeEventListener('resize', closeTooltip)
    }
  }, [])

  if (!tooltip) return null

  return (
    <div
      id={TOOLTIP_ID}
      role="tooltip"
      className={styles.tooltip}
      style={{
        left: tooltip.left,
        top: tooltip.top ?? 'auto',
        bottom: tooltip.bottom ?? 'auto',
      }}
    >
      {tooltip.text}
    </div>
  )
}

export default OverflowTooltip
