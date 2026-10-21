const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value);
}

export function isTime(value: unknown): value is string {
  return typeof value === 'string' && timePattern.test(value);
}

export function isCalendarDate(value: unknown): value is string {
  return typeof value === 'string' && calendarDatePattern.test(value);
}
