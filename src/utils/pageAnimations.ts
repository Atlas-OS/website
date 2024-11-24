import { createIntersectionObserver } from './animations'

export const initializePageAnimations = () => {
    const sections = [
        {
            selector: '.upgrade-comparison',
            animations: [
                {
                    selector: '.upgrade-comparison .heading h2',
                    keyframes: { opacity: [0, 1], y: [30, 0] }
                },
                {
                    selector: '.upgrade-comparison .heading p',
                    keyframes: { opacity: [0, 1], y: [30, 0] },
                    options: { delay: 0.1 }
                },
                {
                    selector: '.upgrade-comparison .card',
                    keyframes: { opacity: [0, 1], y: [30, 0], scale: [0.95, 1] },
                    options: {
                        delay: 0.2,
                        stagger: {
                            interval: 0.1,
                            from: 'first'
                        }
                    }
                }
            ]
        },
        {
            selector: '.windows-comparison',
            animations: [
                {
                    selector: '.windows-comparison .heading',
                    keyframes: { opacity: [0, 1], y: [30, 0] }
                },
                {
                    selector: '.windows-comparison .card',
                    keyframes: { opacity: [0, 1], y: [50, 0] },
                    options: {
                        delay: 0.2,
                        stagger: {
                            interval: 0.1,
                            from: 'first'
                        }
                    }
                }
            ]
        },
        {
            selector: '.linus-section',
            animations: [
                { selector: '.heading h3' },
                { selector: '.heading p', options: { delay: 0.1 } },
                {
                    selector: '.preview-image',
                    keyframes: { opacity: [0, 1], scale: [0.98, 1] },
                    options: { delay: 0.2 }
                },
                {
                    selector: '.circle',
                    keyframes: { opacity: [0, 1], scale: [0.5, 1] },
                    options: { duration: 0.6, delay: 0.4 }
                }
            ]
        },
        {
            selector: '.community-section',
            animations: [
                { selector: 'h3' },
                { selector: 'p', options: { delay: 0.1 } },
                {
                    selector: '.buttons',
                    keyframes: { opacity: [0, 1], y: [20, 0] },
                    options: { delay: 0.2 }
                }
            ]
        }
    ]

    sections.forEach(({ selector, animations }) => {
        const observer = createIntersectionObserver(animations)
        const section = document.querySelector(selector)
        if (section) observer.observe(section)
    })
}
