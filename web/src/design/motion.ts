// Motion language constants from KIRO PLAN V3

export const spring = {
  snappy: { type: 'spring' as const, stiffness: 420, damping: 34 },
  soft: { type: 'spring' as const, stiffness: 260, damping: 28 },
  fly: { type: 'spring' as const, stiffness: 300, damping: 26, mass: 0.9 },
}

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
}

export const dur = {
  fast: 0.15,
  base: 0.22,
  slow: 0.4,
}

export const stagger = 0.06

// Page load animation variants
export const rise = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.base, ease: ease.out },
  },
}

export const container = {
  show: {
    transition: { staggerChildren: stagger },
  },
}
