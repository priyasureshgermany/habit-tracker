# Habit Tracker

Habits, fitness and a diary in one installable, offline web app. A sibling of
the expense tracker and asset-management apps, built the same way: plain HTML,
CSS and JavaScript, no build step, data on the device, and an optional manual
GitHub backup.

## What's in it

- **Today**: a ring for the day's habits, a 14-day strip for filling in missed
  days, quick mood check-in, and the week's fitness at a glance.
- **Habits**: yes/no, count (glasses, pages, steps) or minutes. Daily, chosen
  weekdays, N times a week, N times a month, or every N days. Build or break a
  habit. Time of day, reminder, start date and a "why". Streaks, best streak,
  30-day and all-time rates, a six-month heatmap and a month calendar for
  editing past days. Archive keeps the history.
- **Fitness**: cardio log (walking, running, cycling, swimming and more) with
  the WHO weekly target of 150 moderate minutes, where vigorous minutes count
  double, and calorie estimates from MET values and your weight. A strength
  library by muscle group (flat stomach, biceps, triceps, shoulders, forearms,
  chest, thighs, glutes, back, calves) with a body map, how-to steps and tips.
  Ready-made routines with a guided set-by-set timer. BMI and a weight history.
- **Diary**: mood, energy and feelings, typed or dictated (browser speech
  recognition), plus voice notes recorded in the app and kept in IndexedDB.
- **Reports**: week / month / year for habits (completion, by day, by weekday,
  per habit), fitness (active minutes, the WHO target week by week, by activity,
  by muscle group, weight) and diary (mood over time, distribution, feelings,
  and mood on good-habit days compared with other days).
- **More**: Profile (name, email, age, weight, height), Goals, Appearance
  (theme and five colour schemes), Diary, Reminders, GitHub sync, Backup &
  restore (JSON file with optional voice notes, CSV export, sample data,
  start over), About & update, and What's new.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | Markup shell and all CSS; `APP_VERSION` |
| `data.js` | The fixed library: cardio, exercises, routines, templates, moods, prompts |
| `core.js` | Helpers, dates, **state** (`stateBlank` / `stateFromPayload`), sheets, audio store, router |
| `habits.js` | Scheduling, streaks, the one `contribution()` rule every rate is built from; Today and Habits screens |
| `fitness.js` | Fitness screen, logging sheets, routine player |
| `moves.js` | Exercise animations: a pose per key frame (hip, shoulder, hands, feet), knees and elbows solved by IK |
| `diary.js` | Diary screen and editor (dictation, recording) |
| `reports.js` | Reports and the SVG charts |
| `settings.js` | More, Settings, GitHub sync, backup, What's new, update, reminders, sample data, `boot()` |
| `sw.js` | Offline cache; the app changes only when you press Update |

All scripts share one global scope, so check for a name collision before adding
a top-level function:

```bash
cat *.js | grep -oP '^\s*(async )?function \K\w+' | sort | uniq -d
```

## Rules that keep the data safe

- **Nothing is pushed unless you press Push.** `save()` writes to localStorage
  and nothing else. A push that would shrink the backup asks first.
- **One constructor.** Every way a book arrives (load, pull, restore) goes
  through `stateFromPayload()`. Add a new field to `stateBlank()`, nowhere else.
- **One rule for rates.** Every percentage is a sum of `contribution(h, day)`,
  so a report's total always equals the sum of its bars.
- Voice notes are pushed once each to `habit-audio/<id>` beside the backup file
  and fetched on pull when the device doesn't have them.
- Use a **private** repository for the backup, because it contains your diary.

## Releasing

```bash
sh tools/install-hooks.sh                       # once per clone
node tools/bump-version.mjs --new "What changed" # once per release
node tools/bump-version.mjs --amend --better "And this"
```

The bump updates `version.json`, `APP_VERSION` in `index.html`, `VERSION` in
`sw.js` and `RELEASES.md`, which the app shows under More → What's new.

`python tools/make-icons.py` redraws the icons.
