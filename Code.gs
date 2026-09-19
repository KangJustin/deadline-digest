/**
 * Fall 2026 Deadline Digest
 * Emails you every Monday and Thursday at 7 AM with:
 *   1. Everything due in the next 7 days, grouped by day
 *   2. Major items (exams, projects, problem sets) coming up in the 2 weeks after that
 *
 * It reads the deadline events already on your Google Calendar (any event titled
 * "STAT 159: ...", "ENGIN 183: ...", "CW 11: ..." or "IEOR 142A: ..."), so when a
 * date changes on your calendar, the email updates automatically.
 *
 * SETUP: paste into script.google.com, then run setupTriggers() once.
 * To send yourself a test email right away, run sendDigest().
 */

const CONFIG = {
  recipient: Session.getActiveUser().getEmail(), // sends to whoever runs the script
  detailDays: 7,          // full detail for this many days ahead
  horizonDays: 21,        // "on the horizon" section looks this far ahead (major items only)
  stopAfter: new Date(2026, 11, 19), // triggers remove themselves after the Dec 18 final
  timeZone: 'America/Los_Angeles',
  courses: {
    'STAT 159':  { color: '#085041', bg: '#E1F5EE', link: 'https://stat159.berkeley.edu/fall-2026/' },
    'ENGIN 183': { color: '#3C3489', bg: '#EEEDFE', link: '' },
    'CW 11':     { color: '#712B13', bg: '#FAECE7', link: 'https://bcourses.berkeley.edu/courses/1556297' },
    'IEOR 142A': { color: '#72243E', bg: '#FBEAF0', link: 'https://bcourses.berkeley.edu/courses/1558092' },
  },
  majorPattern: /exam|midterm|final|project|report|proposal|presentation|speech|problem set|video|quiz/i,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TITLE_RE = /^(STAT 159|ENGIN 183|CW 11|IEOR 142A):\s*(.+)$/;

function sendDigest() {
  const now = new Date();

  if (now > CONFIG.stopAfter) {
    removeTriggers();
    return;
  }

  const today = startOfDay(now);
  const detailEnd = new Date(today.getTime() + (CONFIG.detailDays + 1) * DAY_MS);
  const horizonEnd = new Date(today.getTime() + (CONFIG.horizonDays + 1) * DAY_MS);

  const seen = {};
  const items = CalendarApp.getDefaultCalendar()
    .getEvents(today, horizonEnd)
    .map(parseEvent)
    .filter(function (e) {
      if (!e) return false;
      if (e.allDay ? e.due < today : e.due < now) return false; // already passed
      const key = e.course + e.name + e.due.getTime();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    })
    .sort(function (a, b) { return a.due - b.due; });

  const thisWeek = items.filter(function (e) { return e.due < detailEnd; });
  const horizon = items.filter(function (e) { return e.due >= detailEnd && e.major; });

  const subject = thisWeek.length
    ? 'Deadlines: ' + thisWeek.length + ' due this week. Next up: ' +
      thisWeek[0].course + ' ' + thisWeek[0].name + ' (' + relativeDay(thisWeek[0].due, today) + ')'
    : 'Deadlines: nothing due in the next 7 days';

  MailApp.sendEmail({
    to: CONFIG.recipient,
    subject: subject,
    htmlBody: buildHtml(thisWeek, horizon, today),
    body: buildText(thisWeek, horizon, today),
  });
}

function parseEvent(ev) {
  const m = ev.getTitle().match(TITLE_RE);
  if (!m) return null;
  const allDay = ev.isAllDayEvent();
  const desc = (ev.getDescription() || '').replace(/<[^>]+>/g, '').trim();
  return {
    course: m[1],
    name: m[2].trim(),
    due: allDay ? ev.getAllDayStartDate() : ev.getEndTime(),
    allDay: allDay,
    note: desc.split('\n')[0],
    estimated: /estimated|confirm date/i.test(m[2]),
    major: CONFIG.majorPattern.test(m[2]),
  };
}

function buildHtml(thisWeek, horizon, today) {
  let html = '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;color:#1f1f1f;">';
  html += '<p style="font-size:15px;margin:0 0 16px;">Here\'s what\'s coming up as of ' +
    fmt(today, 'EEEE, MMMM d') + '.</p>';

  html += sectionHeader('Due in the next 7 days');
  if (!thisWeek.length) {
    html += '<p style="color:#6b6b6b;font-size:14px;">Nothing due this week. Good time to get ahead.</p>';
  } else {
    let currentDay = '';
    thisWeek.forEach(function (e) {
      const dayLabel = fmt(e.due, 'EEEE, MMM d') + ' · ' + relativeDay(e.due, today);
      if (dayLabel !== currentDay) {
        currentDay = dayLabel;
        html += '<p style="font-size:13px;font-weight:600;color:#444;margin:16px 0 6px;">' + dayLabel + '</p>';
      }
      html += itemRow(e, true);
    });
  }

  html += sectionHeader('On the horizon (major items, next 3 weeks)');
  if (!horizon.length) {
    html += '<p style="color:#6b6b6b;font-size:14px;">No major deadlines beyond this week.</p>';
  } else {
    horizon.forEach(function (e) { html += itemRow(e, false); });
  }

  html += '<p style="font-size:12px;color:#8a8a8a;margin-top:24px;border-top:1px solid #e5e5e5;padding-top:12px;">' +
    'Pulled live from your Google Calendar. Items marked "estimated" haven\'t been confirmed yet, ' +
    'so double-check on bCourses. Recurring weekly items (CW 11 Sunday assignments, IEOR Q&amp;A) show up in the week they\'re due.</p>';
  html += '</div>';
  return html;
}

function itemRow(e, showNote) {
  const c = CONFIG.courses[e.course];
  const time = e.allDay ? 'All day (time TBA)' : fmt(e.due, 'h:mm a');
  const when = showNote ? time : fmt(e.due, 'EEE, MMM d') + ' · ' + time;
  const tag = '<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:' +
    c.bg + ';color:' + c.color + ';margin-right:8px;">' + e.course + '</span>';
  const est = e.estimated ? ' <span style="font-size:11px;color:#854F0B;">(estimated)</span>' : '';
  const weight = e.major ? 'font-weight:600;' : '';
  let row = '<div style="padding:8px 12px;margin:0 0 6px;border-left:3px solid ' + c.color + ';background:#fafafa;">' +
    '<div style="font-size:14px;' + weight + '">' + tag + esc(e.name) + est + '</div>' +
    '<div style="font-size:12px;color:#6b6b6b;margin-top:3px;">' + when + '</div>';
  if (showNote && e.note) {
    row += '<div style="font-size:12px;color:#6b6b6b;margin-top:3px;">' + esc(truncate(e.note, 160)) + '</div>';
  }
  if (c.link) {
    row += '<div style="font-size:12px;margin-top:3px;"><a href="' + c.link + '" style="color:#185FA5;">Course page</a></div>';
  }
  return row + '</div>';
}

function buildText(thisWeek, horizon, today) {
  let t = 'Deadlines as of ' + fmt(today, 'EEEE, MMMM d') + '\n\nDUE IN THE NEXT 7 DAYS\n';
  if (!thisWeek.length) t += '  Nothing due this week.\n';
  thisWeek.forEach(function (e) {
    t += '  ' + fmt(e.due, 'EEE M/d') + ' ' + (e.allDay ? '(all day)' : fmt(e.due, 'h:mm a')) +
      '  ' + e.course + ': ' + e.name + (e.estimated ? ' (estimated)' : '') + '\n';
  });
  t += '\nON THE HORIZON\n';
  if (!horizon.length) t += '  No major deadlines beyond this week.\n';
  horizon.forEach(function (e) {
    t += '  ' + fmt(e.due, 'EEE M/d') + '  ' + e.course + ': ' + e.name + (e.estimated ? ' (estimated)' : '') + '\n';
  });
  return t;
}

function sectionHeader(text) {
  return '<h2 style="font-size:16px;font-weight:600;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #1f1f1f;">' + text + '</h2>';
}

function relativeDay(date, today) {
  const diff = Math.round((startOfDay(date) - today) / DAY_MS);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return 'in ' + diff + ' days';
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmt(d, pattern) {
  return Utilities.formatDate(d, CONFIG.timeZone, pattern);
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Run once: schedules the digest for Mondays and Thursdays around 7 AM. */
function setupTriggers() {
  removeTriggers();
  ScriptApp.newTrigger('sendDigest').timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).everyWeeks(1).create();
  ScriptApp.newTrigger('sendDigest').timeBased()
    .onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(7).everyWeeks(1).create();
}

/** Stops the emails. Also runs automatically after finals. */
function removeTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'sendDigest'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
}
