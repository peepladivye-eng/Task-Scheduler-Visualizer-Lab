export function withThemeTransition(origin: { x: number; y: number }, apply: () => void): void {
  // Check for reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply()
    return
  }
  
  // Check for View Transitions API support
  type DocumentWithViewTransition = Document & {
    startViewTransition?: (callback: () => void) => { ready: Promise<void> }
  }
  
  const doc = document as DocumentWithViewTransition
  
  if (!doc.startViewTransition) {
    apply()
    return
  }
  
  // Calculate the radius for the circular reveal
  const x = origin.x
  const y = origin.y
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )
  
  // Start the view transition
  const transition = doc.startViewTransition(apply)
  
  // Animate the new view with a circular clip-path
  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0 at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 500,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        pseudoElement: '::view-transition-new(root)',
      }
    )
  })
}
