import { animate, stagger } from 'motion'

export const smoothEasing = [0.22, 1, 0.36, 1]

export interface AnimateElementOptions {
    selector: string
    keyframes?: Record<string, any>
    options?: any & {
        stagger?: {
            interval: number
            from?: 'first' | 'last' | 'center'
        }
    }
}

const prefersReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false

// Default animation presets
const defaultKeyframes = {
    fadeUp: prefersReducedMotion ? { opacity: [0, 1] } : { opacity: [0, 1], y: [30, 0] },
    fadeIn: { opacity: [0, 1] },
    scaleIn: prefersReducedMotion ? { opacity: [0, 1] } : { opacity: [0, 1], scale: [0.98, 1] }
}

const defaultOptions = {
    duration: prefersReducedMotion ? 0.4 : 0.8,
    easing: smoothEasing
}

export function animateElement({ selector, keyframes = defaultKeyframes.fadeUp, options = {} }: AnimateElementOptions): any | undefined {
    const elements = document.querySelectorAll(selector)
    if (!elements.length) return

    // Handle stagger if specified
    const delay = options.stagger ? stagger(options.stagger.interval, { from: options.stagger.from || 'first' }) : options.delay

    // Add will-change before animation
    if (!prefersReducedMotion) {
        elements.forEach((element) => {
            if (element instanceof HTMLElement) {
                const props = Object.keys(keyframes).join(', ')
                element.style.willChange = props
            }
        })
    }

    const animationOptions = {
        ...defaultOptions,
        ...options,
        delay
    }

    // Remove stagger from options as it's not a valid animation option
    if ('stagger' in animationOptions) {
        delete animationOptions.stagger
    }

    return animate(elements, keyframes, {
        ...animationOptions,
        onComplete: () => {
            elements.forEach((element) => {
                if (element instanceof HTMLElement) {
                    element.style.willChange = 'auto'
                }
            })
        }
    })
}

export function createIntersectionObserver(animations: AnimateElementOptions[], threshold = 0.2) {
    let hasAnimated = false
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !hasAnimated) {
                    hasAnimated = true
                    Promise.all(animations.map(animateElement))
                    observer.disconnect()
                }
            })
        },
        { threshold }
    )
    return observer
}
