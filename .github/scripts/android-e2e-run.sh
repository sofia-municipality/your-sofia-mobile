#!/usr/bin/env bash
#
# Boots the CI emulator into a testable state and runs the Android Detox
# suite. Invoked as a single `bash` line from the `script:` input of
# reactivecircus/android-emulator-runner in .github/workflows/e2e-android.yml
# — that action runs each line of a multi-line `script:` input as its own
# separate invocation, so the real control flow (retries, a shared failure
# handler) has to live in an actual script, not inline in the workflow YAML.
set -euo pipefail

dump_logcat_and_exit() {
  echo "--- adb logcat ---"
  adb logcat -d
  exit 1
}
trap dump_logcat_and_exit ERR

# A freshly created AVD boots with the device not yet marked
# "provisioned"/setup-complete and the keyguard still up. Espresso then hits
# a hard-coded, non-configurable 10s wait ("Waited for the root of the view
# hierarchy to have window focus...") because our Activity's window never
# becomes the focused one — some other system window still owns focus.
#
# As the app has grown, cold boot now sometimes runs long enough that
# `boot_completed` fires while the system is still busy settling — and the
# home launcher itself (nexuslauncher) ANRs ("Input dispatching timed out
# (Application does not have a focused window)"), a *system-wide* focus
# loss, not just the keyguard. Poking it with settings/input commands while
# it's in that state doesn't help, so wait for dumpsys to report *any*
# focused window first, up to 60s, before touching anything else.
echo "Waiting for a focused window..."
for _ in $(seq 1 30); do
  if adb shell dumpsys window 2>/dev/null | grep -q 'mCurrentFocus=Window{'; then
    echo "Window focus acquired."
    break
  fi
  sleep 2
done

adb shell svc power stayon true
adb shell settings put global device_provisioned 1
adb shell settings put secure user_setup_complete 1

# A single dismiss-keyguard call still raced the keyguard/SystemUI finishing
# its own post-boot initialization on some runs (observed the same 10s
# window-focus failure intermittently even after boot_completed had already
# fired). Retrying it for ~10s closes that race.
#
# This used to also fire `adb shell input keyevent 82` (a legacy MENU-key
# nudge) alongside `wm dismiss-keyguard` on each retry. `wm dismiss-keyguard`
# goes straight through WindowManagerService and is a safe no-op if the
# keyguard isn't showing — but `input keyevent` goes through the real
# input-dispatch pipeline, and firing it while the system is mid-boot
# transition (nothing focused yet) can itself make Android declare an ANR
# ("Input dispatching timed out (Application does not have a focused
# window)"), which gets misattributed to the home launcher — exactly the
# failure this was supposed to prevent. Dropped in favor of
# `wm dismiss-keyguard` alone.
echo "Dismissing keyguard..."
for _ in 1 2 3 4 5; do
  adb shell wm dismiss-keyguard
  sleep 2
done

echo "Running Detox tests..."
pnpm e2e:test:android
