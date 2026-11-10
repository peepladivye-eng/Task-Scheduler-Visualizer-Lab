import { create } from 'zustand'

type Mode = 'light' | 'dark' | 'system'
type Accent = 'ink' | 'teal' | 'violet' | 'amber'
type Resolved = 'light' | 'dark'

interface ThemeState {
  mode: Mode
  accent: Accent
  resolved: Resolved
  setMode: (mode: Mode) => void
  setAccent: (accent: Accent) => void
}

function getSystemTheme(): Resolved {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: Mode): Resolved {
  if (mode === 'system') return getSystemTheme()
  return mode
}

function applyTheme(resolved: Resolved, accent: Accent) {
  const root = document.documentElement
  root.dataset.theme = resolved
  root.dataset.accent = accent
  root.style.colorScheme = resolved
}

export const useTheme = create<ThemeState>((set, get) => {
  // Initialize from localStorage
  const savedMode = (typeof window !== 'undefined' ? localStorage.getItem('sl-mode') : null) as Mode | null
  const savedAccent = (typeof window !== 'undefined' ? localStorage.getItem('sl-accent') : null) as Accent | null
  
  const initialMode = savedMode || 'system'
  const initialAccent = savedAccent || 'ink'
  const initialResolved = resolveTheme(initialMode)
  
  // Apply on init
  if (typeof window !== 'undefined') {
    applyTheme(initialResolved, initialAccent)
  }
  
  // Listen to system theme changes
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      const state = get()
      if (state.mode === 'system') {
        const newResolved = getSystemTheme()
        set({ resolved: newResolved })
        applyTheme(newResolved, state.accent)
      }
    })
  }
  
  return {
    mode: initialMode,
    accent: initialAccent,
    resolved: initialResolved,
    
    setMode: (mode: Mode) => {
      const state = get()
      const resolved = resolveTheme(mode)
      set({ mode, resolved })
      localStorage.setItem('sl-mode', mode)
      applyTheme(resolved, state.accent)
    },
    
    setAccent: (accent: Accent) => {
      const state = get()
      set({ accent })
      localStorage.setItem('sl-accent', accent)
      applyTheme(state.resolved, accent)
    },
  }
})
