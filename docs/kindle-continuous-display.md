# Kindle Continuous Display Guide

ReKindle works in the Kindle Experimental Browser without a jailbreak. Start with
the unmodified device before considering firmware-specific changes.

## Baseline Setup

1. Connect the Kindle to Wi-Fi and power for a long-running test.
2. Open the ReKindle dashboard URL in Experimental Browser.
3. If Experimental Browser remains in portrait mode, confirm that ReKindle rotates
   its content into an emulated landscape layout.
4. Confirm that the dashboard renders and that touch targets open detail pages.

## Physical Validation Checklist

### UI checkpoint

- Read the dashboard clock from approximately 4 meters.
- Read the two smaller forecast summaries from approximately 2 meters.
- Confirm that PNG icons are distinct and legible.
- Open calendar, weather, air quality, and alert detail pages.
- Confirm that the screen returns to the dashboard after 5 minutes.

### Long-running checkpoint

- Confirm that the clock changes locally without a page reload.
- Confirm that the full dashboard refreshes after 30 minutes.
- Leave the browser open long enough to observe the stock firmware sleep behavior.
- Record the Kindle model and firmware version before evaluating optional tweaks.

## Optional Tweaks

No firmware-specific continuous-display tweak is documented as verified yet.
Add one only after testing it on the target Paperwhite 2 firmware. Document:

- the exact firmware version;
- whether jailbreak is required;
- the commands or settings used;
- the observed effect on sleep behavior;
- the expected battery impact;
- a reversal procedure.
