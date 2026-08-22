/** Meeting times are scheduled in Somalia (UTC+3). */

function ymdInSomalia(dateVal) {
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function atSomalia(dateVal, hm = '00:00') {
  const ymd = ymdInSomalia(dateVal);
  if (!ymd) return null;
  const [h, m] = String(hm || '00:00').split(':');
  const hh = String(h || '00').padStart(2, '0');
  const mm = String(m || '00').padStart(2, '0');
  return new Date(`${ymd}T${hh}:${mm}:00+03:00`);
}

export function meetingStartDate(meeting) {
  if (!meeting?.date) return null;
  return atSomalia(meeting.date, meeting.startTime || '00:00');
}

export function meetingEndDate(meeting) {
  if (!meeting?.date) return null;
  const start = meetingStartDate(meeting);
  const end = atSomalia(meeting.date, meeting.endTime || meeting.startTime || '23:59');
  if (!start || !end) return end;
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

export function isMeetingEnded(meeting, now = new Date()) {
  if (!meeting) return false;
  if (meeting.status === 'cancelled') return true;
  if (meeting.status === 'ongoing') return false;
  const end = meetingEndDate(meeting);
  return !!(end && end < now);
}
