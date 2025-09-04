import { formatInTimeZone } from 'date-fns-tz'

export function formatNaiveInTZ(instant: Date, tz: string) {
  return formatInTimeZone(instant, tz, "yyyy-MM-dd'T'HH:mm:ss")
}
