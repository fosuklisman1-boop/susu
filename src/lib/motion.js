// Shared easing curves
export const easeOut = [0.16, 1, 0.3, 1]
export const easeSmooth = [0.4, 0, 0.2, 1]

// Spring presets
export const springSnappy = { type: 'spring', damping: 28, stiffness: 320 }
export const springGentle = { type: 'spring', damping: 25, stiffness: 200 }
export const springBouncy = { type: 'spring', damping: 18, stiffness: 260, mass: 0.8 }

// Page/section fade-up
export const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
}

// Fade only
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// Scale into view
export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: easeOut } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18 } },
}

// Slide in from the left (sidebar)
export const slideInLeft = {
  initial: { x: '-100%' },
  animate: { x: 0, transition: { type: 'spring', damping: 28, stiffness: 280 } },
  exit: { x: '-100%', transition: { type: 'spring', damping: 32, stiffness: 300 } },
}

// Overlay backdrop
export const backdropFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

// Stagger container — apply to the parent wrapper
export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

// Stagger item — apply to each direct child
export const staggerItem = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.38, ease: easeOut } },
}

// Stagger item (sidebar links)
export const sidebarLinkItem = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: easeOut } },
}

// Notification badge pop
export const badgePop = {
  initial: { scale: 0 },
  animate: { scale: 1, transition: { type: 'spring', damping: 16, stiffness: 400 } },
  exit: { scale: 0, transition: { duration: 0.12 } },
}
