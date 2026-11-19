# Sabr

Sabr (صبر, "patience") is a medicine reminder for Android. One pill a day is
fine with a phone alarm. Five medicines, some twice a day, one only on Fridays
and one every other week, is not. Sabr knows the schedule, asks "did you take
it?" and remembers the answer.

It started as a replacement for Samsung Health's Medications feature, which
isn't available in the UAE. It's free and open source (GPL-3.0). The APK is on
sabr.danishali.dev and the GitHub releases page.

## What it does

- **Schedules.** Every day, chosen weekdays, every few days or weeks, on/off
  cycles like 21 on and 7 off, monthly, or as needed. A medicine can be due
  several times a day, have start and end dates, or be paused for a while.
- **Times that follow your week.** Different times on work days and weekends,
  home time while travelling, and a Ramadan mode that moves doses to suhoor and
  iftar using prayer times worked out on the phone.
- **Reminders you answer from the notification.** Taken, Snooze and Skip
  buttons. They use Android's alarm-clock delivery so battery saver can't hold
  them back, and they can repeat until you answer.
- **History.** Today lists what's due and what's done. A calendar colours every
  day, and you can tap a day to see or fix what was logged. A PDF report for any
  period is there for the doctor.
- **Doses and stock.** Strength and amount are kept apart (500 mg, 3 tablets),
  half tablets and ml work, and stock is counted so you get a refill alert with
  roughly how many days are left.
- **Medicine search and interactions.** Search a built-in list of common UAE
  brands and the US RxNorm list, or scan the box. Interactions between your
  medicines, alcohol and food are checked against a short built-in list and the
  US drug labels from openFDA. The app says plainly that this isn't complete.
- **Streaks that don't punish you.** A late dose still counts. Only a dose never
  taken breaks the streak, freezes cover the odd bad day, and planned skips
  (a test, a doctor's instruction) don't count at all.
- **Routines.** Medicines you take together share one reminder with Take all,
  and an empty-stomach medicine starts a timer for when you can eat.
- **Widgets, notes and themes.** Home screen widgets, mood and symptom notes,
  a photo per pill, and light, dark and true-black modes.

## Privacy

There's no account, no analytics and no server by default. Everything stays on
the phone. Online medicine search and medicine names in reminders are off until
you turn them on. Backups are password-locked files you keep where you like, and
there's an optional fingerprint or PIN lock.

If you run your own PocketBase server, Sabr can keep an encrypted backup there
and let a family member see whether today's doses were taken. It's encrypted on
the phone first, so the server can't read it.

## How it's built

- React Native and Expo with Expo Router, written in TypeScript.
- SQLite on the phone for medicines, doses and history.
- The schedule, streak, reminder and dose logic is plain TypeScript with unit
  tests, kept apart from the screens.
- GitHub Actions runs the tests, builds the APK, opens it on an emulator, and
  publishes a release with screenshots of every screen in light and dark mode.
  The screenshots here come from the newest release.

## What's next

Fixes from using 0.6 on a real phone. It's Android only for now.

Sabr is a reminder tool, not medical advice.
