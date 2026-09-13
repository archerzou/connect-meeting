// Helpers to convert between minutes and the .NET TimeSpan string format ("HH:mm:ss").

export function minutesToTimeSpan(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(h)}:${pad(m)}:00`
}

export function timeSpanToMinutes(timeSpan: string): number {
  if (!timeSpan) return 0
  // Supports "HH:mm:ss" and "d.HH:mm:ss"
  let days = 0
  let rest = timeSpan
  if (rest.includes(".") && rest.indexOf(".") < rest.indexOf(":")) {
    const [d, r] = rest.split(/\.(.+)/)
    days = Number(d)
    rest = r
  }
  const [h = "0", m = "0"] = rest.split(":")
  return days * 24 * 60 + Number(h) * 60 + Number(m)
}

export function formatDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}
