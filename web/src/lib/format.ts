/** Format a number to `digits` decimal places. */
export function fmt(n: number, digits = 2): string {
  return n.toFixed(digits)
}

/** Format milliseconds: "3.00 ms" */
export function fmtMs(n: number): string {
  return `${fmt(n)} ms`
}

/** Format percentage: "75.00 %" */
export function fmtPct(n: number): string {
  return `${fmt(n)} %`
}
