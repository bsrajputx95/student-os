const escape = s => String(s || '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;').replaceAll('\r', '');
export function calendarEvent(event) {
  const date = event.date.replaceAll('-', '');
  if (!/^\d{8}$/.test(date)) throw new Error('Event date is unavailable.');
  const end = new Date(event.date + 'T12:00:00Z');
  end.setUTCDate(end.getUTCDate() + 1);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudentOS//Campus Calendar//EN', 'BEGIN:VEVENT', 'UID:' + escape(event.id) + '@studentos', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]|\.\d{3}/g, ''), 'DTSTART;VALUE=DATE:' + date, 'DTEND;VALUE=DATE:' + end.toISOString().slice(0, 10).replaceAll('-', ''), 'SUMMARY:' + escape(event.name), 'DESCRIPTION:' + escape(event.description), 'LOCATION:' + escape(event.location), ...(event.cancelled ? ['STATUS:CANCELLED'] : []), 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
