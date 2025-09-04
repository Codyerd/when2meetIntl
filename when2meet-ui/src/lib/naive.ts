export function toNaiveLocalISO(dt: Date) {
  // Format: YYYY-MM-DDTHH:MM:SS (no timezone)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
}
