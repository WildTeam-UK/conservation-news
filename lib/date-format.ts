export const londonLongDateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long',
  timeZone: 'Europe/London',
});

export const londonCalendarDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const londonMediumDateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});
