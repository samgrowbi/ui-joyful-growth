# Landing page cleanup and sizing

## Changes
- Replace the six facial result cards with the six supplied before-and-after photos in order, preserving card names, ages, badge, controls, sizing, and carousel behavior.
- Remove the Sofia chat interface and all client-side references so it no longer loads anywhere.
- Remove Google Maps, Yelp, and Trustpilot badges and collapse their former spacing.
- Make the "Who Is This For?" section shorter only below 768px while leaving tablet and desktop styling unchanged.
- Compact the five treatment stat cards at every size, retaining the current blue accent styling and using a two-column mobile grid with the fifth card spanning the row.

## Cleanup and verification
- Remove result-image imports and files that become unused, plus unused review-logo and chatbot client assets.
- Check all landing-page routes at 1440px, 768px, and 375px for layout, overflow, empty gaps, console errors, image loading, and PageView pixel initialization.

## Technical details
- Use the shared Results, About, WhoIsThisFor, and TrustStrip components so every treatment landing page receives the same update.
- Keep treatment copy, booking forms, page structure, tracking code, and all unrelated sections unchanged.
