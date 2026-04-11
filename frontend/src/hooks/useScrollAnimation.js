// src/hooks/useScrollAnimation.js — Scroll-triggered animation hook

import { useEffect, useRef } from 'react'

/**
 * Custom hook that uses IntersectionObserver to trigger CSS animations
 * when elements scroll into view.
 * 
 * Usage:
 *   const ref = useScrollAnimation('scroll-fade-up')
 *   <div ref={ref} className="scroll-animate scroll-fade-up">...</div>
 */
export function useScrollAnimation(animClass = 'scroll-fade-up', threshold = 0.1) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('scroll-visible')
          observer.unobserve(el) // only trigger once
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return ref
}

/**
 * Observe multiple children within a container for staggered scroll animations.
 * Adds 'scroll-visible' class to each child as it comes into view.
 */
export function useScrollAnimateChildren(containerRef, selector = '.scroll-animate') {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const children = container.querySelectorAll(selector)
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    )

    children.forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [containerRef, selector])
}
