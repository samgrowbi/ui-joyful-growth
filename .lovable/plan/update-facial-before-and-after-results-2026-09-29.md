# Update facial before-and-after results

## Changes
- Replace the shared facial results set with exactly the five supplied composite images in the listed order and assign Catherine 38, Margaret 41, Elaine 62, Brianna 34, and Rosalind 42.
- Add optional per-image positioning data and apply consistent fixed-ratio, centered framing while keeping both before-and-after halves visible.
- Remove facial result badges, "No Filters," and "Verified Photos" without changing the section heading, cards, controls, carousel, or surrounding sections.
- Use the requested descriptive alt text and retain lazy image loading.
- Leave Body Sculpting and its EMS before-and-after results unchanged.

## Verification
- Visually inspect all five facial cards at 1440px, 768px, and 375px, tuning individual positioning only where needed.
- Confirm five pagination dots, correct names and ages, intact two-sided images, no removed text or badges, no overflow, and no preview errors.

## Technical details
- Extend the shared result data shape with an optional `objectPosition` field.
- Apply facial-only presentation changes conditionally so treatment-specific Body/EMS result data keeps its current appearance and behavior.
