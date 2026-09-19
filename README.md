# Deadline Digest

A Google Apps Script that emails me a summary of upcoming course deadlines every **Monday and Thursday at 7 AM**, pulled live from my Google Calendar.

Built for Fall 2026: STAT 159, ENGIN 183, CW 11, and IEOR 142A.

## What the email looks like

**Subject:** `Deadlines: 4 due this week. Next up: IEOR 142A Problem Set #1 due (tomorrow)`

The email has two sections:

1. **Due in the next 7 days.** Everything, grouped by day, with the due time, a countdown ("today", "tomorrow", "in 3 days"), a course color tag, and the first line of the event's instructions.
2. **On the horizon.** Only major items (exams, quizzes, projects, problem sets, speeches, proposals) due 8–21 days out, so big deadlines show up early.

Items labeled "estimated" are dates that haven't been confirmed by the course yet.

## How it works

```
Google Calendar ──► sendDigest() ──► HTML email to me
      ▲                   ▲
      │                   │
 deadline events    time-driven triggers
 titled "COURSE:"   (Mon + Thu, ~7 AM PT)
```

- The script **doesn't store any deadlines itself.** Each time it runs, it reads my calendar. Updating an event on the calendar (e.g. when a problem set date is confirmed) updates the next email automatically.
- It only picks up events whose title starts with a course prefix and a colon:
  `STAT 159:`, `ENGIN 183:`, `CW 11:`, `IEOR 142A:`.
  Regular class sessions (e.g. `STAT 159 — Lecture`) don't have the colon, so they're ignored.
- Deadlines that have already passed are skipped. Duplicates are removed.
- After **Dec 19, 2026** (the day after my last final), the script deletes its own triggers and stops sending.

## Files

| File | Purpose |
|---|---|
| `Code.gs` | The script: `sendDigest()`, `setupTriggers()`, `removeTriggers()`, and helpers |
| `appsscript.json` | Project manifest: time zone (Los Angeles), V8 runtime, and permissions |
| `.gitignore` | Keeps local `clasp` credentials out of the repo |

## Setup

1. Go to [script.google.com](https://script.google.com) signed in as the account with the deadline calendar, and create a **New project**.
2. Paste the contents of `Code.gs` into the editor and save.
3. **Project Settings (gear icon):** set the time zone to *(GMT-07:00) Los Angeles*.
4. Pick `sendDigest` in the function dropdown and click **Run**. Approve the permissions prompt. A test email should arrive within a minute.
5. Pick `setupTriggers` and click **Run** once to turn on the Monday/Thursday schedule.

### Permissions it asks for

- **Calendar (read-only):** to read deadline events
- **Send email as you:** to send the digest to yourself
- **Manage triggers:** to schedule itself and to stop after finals
- **Email address:** to know where to send the digest

It never modifies the calendar and only emails the account that runs it.

## Customizing

All settings are in the `CONFIG` block at the top of `Code.gs`.

| Want to... | Change |
|---|---|
| Send on different days or times | The two `WeekDay` / `atHour` lines in `setupTriggers()`, then run `setupTriggers()` again |
| Look further ahead | `detailDays` (full list) and `horizonDays` (major items only) |
| Add a new course | Add it to `courses` in `CONFIG` **and** to `TITLE_RE`, then title its calendar events `COURSE NAME: ...` |
| Change what counts as "major" | Edit the `majorPattern` regex |
| Keep it running next semester | Update `stopAfter`, the course list, and `TITLE_RE` |
| Stop the emails | Run `removeTriggers()` |

## Troubleshooting

- **No email arrived:** check **Executions** (left sidebar) for errors, and check spam.
- **Wrong send time:** the project time zone isn't set to Los Angeles (Setup step 3).
- **An event is missing:** its title must start with the exact course prefix followed by a colon.
- **Berkeley account blocks Apps Script:** run it from a personal Gmail instead. Share the Berkeley calendar with that account, and in `Code.gs` replace `CalendarApp.getDefaultCalendar()` with `CalendarApp.getCalendarById('your-berkeley-email@berkeley.edu')`.

## Optional: keep GitHub and Apps Script in sync

Editing this repo does **not** change the running script. To sync them, use Google's [`clasp`](https://github.com/google/clasp):

```bash
npm install -g @google/clasp
clasp login
clasp clone <SCRIPT_ID>   # from Project Settings in the Apps Script editor
# edit files locally, then:
clasp push                # upload to Apps Script
git commit -am "..." && git push
```
