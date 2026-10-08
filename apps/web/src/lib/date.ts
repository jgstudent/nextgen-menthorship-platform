export function formatCalendarDate(value: string, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(new Date(value));
}

export function formatDate(value: string, locale = "en-US") {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    ...(isDateOnly ? { timeZone: "UTC" } : {})
  }).format(new Date(value));
}

export function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}
