import { create } from 'zustand'

interface FocusState {
  pid: number | null
  set: (pid: number | null) => void
}

export const useFocus = create<FocusState>((set) => ({
  pid: null,
  set: (pid) => set({ pid }),
}))

/**
 * Returns props to attach to any element representing a PID.
 * Sets focus on pointer enter/focus, clears on pointer leave/blur.
 */
export function focusProps(pid: number) {
  return {
    onPointerEnter: () => useFocus.getState().set(pid),
    onPointerLeave: () => useFocus.getState().set(null),
    onFocus: () => useFocus.getState().set(pid),
    onBlur: () => useFocus.getState().set(null),
  }
}

/**
 * Returns Tailwind classes for dimming when another PID is focused.
 * Apply to any element representing a PID.
 */
export function dimClass(focusPid: number | null, pid: number): string {
  if (focusPid !== null && focusPid !== pid) {
    return 'opacity-35 transition-opacity duration-150'
  }
  return 'opacity-100 transition-opacity duration-150'
}
