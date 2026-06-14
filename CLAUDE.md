# Shinpo — project brief for Claude Code

Read this before any task. It is the contract for the whole project.

## What this is
A private, single-user daily companion: study tracking + a tiny daily habit
check-in, with a silly monkey mascot. Fun but minimal. Calm, never gamified.
End goal: runs on the user's iPhone and iPad.

## The core rule (anti-dopamine)
The user is actively reducing compulsive phone use and quick-dopamine loops, so
the app must never become one. No points, levels, badges, variable rewards,
punishing streaks, guilt mechanics, or engagement hooks. If a feature would make
the app more "engaging/addictive," that is a reason NOT to build it.
**Only three things can ever show as "missed" in a day (the S-tier). Everything
else is supportive and can never read as failure.**

## The monkey mascot
A calm, silly, hand-drawn monkey. Charm, not leverage. Hard rules:
- The monkey has NO opinion about misses — no sad/disappointed states, no streak
  he guards, no levelling up, no nagging.
- He is just a friendly presence (e.g. relaxed on the home screen).
- Real art shipped from Claude Design (icons/monkey/*.png), one pose per
  context: `pro` on Home, `pomodoro` on the Study screen, `focus` in the
  full-screen pomodoro, `work`/`reading` on the Work day / Rest day check-ins,
  `progress` in the Calendar legend, `hydrate` in Settings. Same poses are
  also used to derive the app/home-screen icons. Any new screen that wants a
  monkey should reuse one of these poses rather than commissioning more.

## Platform & tech (non-negotiable)
- Local-first PWA. Vanilla HTML/CSS/JS — no framework, no build step.
- All data on-device in localStorage. No backend, no account, no external APIs,
  no analytics, no external font/CDN requests — must work fully offline.
- Installs cleanly to the iOS/iPadOS home screen (web manifest + apple meta tags)
  and runs standalone/full-screen.
- Service worker so it works offline after first load.
- Manual JSON export/import so data can never be silently lost.
- Responsive: works on iPhone and iPad (iPad may use a roomier layout — same app).

## Screens (V1)
The app is split into separate full-screen views, not one long page. Each
screen exists so the user sees only what that moment needs — especially the
pomodoro, which must be distraction-free.

- **Home**: three buttons — Study / Work day / Rest day — plus a calendar icon
  (corner) for the Calendar and a gear icon (corner) for Settings. This is
  where the monkey placeholder lives (a calm presence, nothing more).
- **Study**: ONLY the pomodoro (prominent), the weekly hours count (the
  highlight), and the 190h total behind a tap. Nothing else. Its own
  minimal/neutral look, distinct from the other screens, to hold focus.
  Back to Home.
- **Work day / Rest day**: the S-tier daily check-in. Tapping either button on
  Home records that as today's day-type, then opens this screen. Work day uses
  a calm-dark theme (focused, not bleak); Rest day uses the warm/light theme.
  Same check-in, themed differently. Back to Home.
- **Settings**: weekly target, total goal, and JSON export/import live here —
  not on the main screens.
- **Calendar**: iPhone-style month grid, reachable from Home. Each day cell
  shows only (a) a subtle dot for that day's day-type (work/rest) and (b) a
  small checkmark if that day's S-tier items were all done/N-A. Prev/next
  month navigation. A gentle look-back, not a streak — no "broken streak"
  states, no red. Back to Home.

## Day type
Tapping Work day or Rest day on Home records that as today's day-type and
opens the check-in screen in the matching theme. Study is available
regardless of day-type (morning study before a late shift counts). The V1 tag
is lightweight — mainly it picks the check-in theme and (later) feeds the
calendar. It does NOT gate the daily check-in.

## Study engine (the heart — build first)
- Two counters, both count UP:
  - Weekly: banks toward a target (default 12h, editable). Resets to 0 every Monday.
  - Total goal: banks toward 190h (editable), never resets. Soft ~16-week horizon,
    no deadline fail-state.
  - Do not hard-code the numbers — keep them in one editable settings spot.
- Every session adds its focused minutes to BOTH counters. Overshooting the weekly
  target is fine — the surplus still feeds the total.
- Pomodoro: choose 25 or 30 min (default), 60 min, or custom.
  25–30 -> 5 min break; 60 -> 15 min break.
- Running a block goes FULL SCREEN with a minimal countdown, built to hold focus.
  Pause (for emergencies) and Cancel are available.
- Credit = focused minutes actually completed, EVEN PARTIAL. Finishing or ending
  early both bank the elapsed focused minutes (break time does not count).
- On natural completion: a gentle chime, then the break.
- Completing/ending a session auto-ticks the "Study" S-tier item to Done.
- A per-session notes field (saved) to jot things down.
- Layout: weekly hours are the highlight; the 190h total sits behind a tap (popup)
  showing progress; the pomodoro clock is prominent.

## Daily check-in (three tiers, only S-tier is scored)
- S-tier (TRACKED — the only items that can "miss"). Each has states:
  Done / In progress / Didn't do, plus a separate "N/A today".
  1. Steady wake + screen-free wind-down
  2. No banana
  3. Study (auto-ticks from a completed/ended study session)
  "In progress" takes over the whole screen ("Doing it now") with a Finished
  button that flips it to Done.
- A-tier (BONUS — visible, tickable, NEVER a miss, no red, no score):
  gym, vegetables, no doomscrolling, sunscreen + moisturiser, cold shower, cook.
  Shown on the Work day / Rest day screens, clearly separated from and below
  the S-tier list, under a "Bonus" heading. Simple checkbox toggles, no states.
- Routines (gentle sequences, NOT scored, no failure state):
  - Morning (same daily): water, no phone on waking, natural light, moisturiser.
  - Night (same daily): read 10 min, water, retinol, moisturiser, magnesium.
  Shown on the same day screens as simple checklists below the Bonus section,
  under "Morning" and "Night" headings. Feed no score.

## Themes
Visual identity from Claude Design is in place (`styles.css`): SF Pro system
font stack (no external fonts/CDNs), a single green accent (`--primary
#1b9b2f`, with focus/on-dark variants), and three reusable surfaces driven by
CSS custom properties:
- `.surface-parchment` (warm/light, `#f5f5f7`): Home, Settings, Rest day check-in.
- `.surface-dark` (calm-dark, `#1a1a1c`): Work day check-in and the full-screen
  pomodoro focus — focused, NOT bleak or grim.
- `.surface-canvas` (white): Study and Calendar — the Study screen's own
  neutral look so the pomodoro stays distraction-free.
Components (cards, rows, progress bars, pills, check items) are surface-
agnostic — they read `--text` / `--card-bg` / `--track` / `--primary-c` etc.
from whichever surface class wraps them, so the same markup/JS works on any
surface. New screens should pick one of these three surfaces rather than
introducing new colors.

## V1 SCOPE — build ONLY this, get it working before anything else
1. Home / Study / Work day / Rest day / Settings as separate screens (see
   Screens section above).
2. Study screen: count-up weekly (12h default) + 190h total popup + pomodoro
   (25/30 default, 60, custom; partial credit; pause/cancel; chime; notes;
   full-screen focus).
3. S-tier daily check-in (3 items, 3 states + "N/A today", full-screen
   "doing it now") on the Work day / Rest day screens.
Warm/light, calm-dark, and neutral themes per screen as described above.
Placeholder monkey on Home. localStorage + JSON export/import (in Settings) +
installable PWA on iPhone/iPad.

## Phase 2 — built
Calendar (month grid, gentle look-back, day-type dot + S-tier checkmark per
day); A-tier bonus checklist; morning/night routine checklists. Day-type
theming (work-dark skin) was already part of V1.

## Phase 3 — built
Full visual identity + real monkey art from Claude Design (see Themes and
The monkey mascot above). Behaviour, data model, and V1/Phase 2 feature set
are unchanged — this was a visual re-skin only.

## Working style
- Smallest working version first. Build interactively; show small, reviewable diffs.
- Keep the V1 look clean and restrained — the real visual identity and the monkey
  come from Claude Design after V1 runs. Don't gold-plate the design now.
- If asked to add anything outside V1 before V1 runs, push back and say why.
- Explain choices simply.
