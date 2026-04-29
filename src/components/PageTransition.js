'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

// Re-animates on every route change via key={pathname}
export default function PageTransition({ children }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
