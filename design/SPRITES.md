# Adding artwork to this preview

Edit `artwork.js`, then reload the local preview. Do not edit embedded base64 assets or the compiled React bundle to add artwork.

- Watamon keys are dex numbers (e.g. `1`), never array positions.
- Item keys are exact names (e.g. `Water Test Kit`); existing numeric IDs are not unique.
- Practice keys are exact names.
- Region keys are exact existing region names. Four working landscape concepts are mapped; Doi Song remains in the gallery until its region mapping is confirmed.

Keep new files under `assets/sprites/`. Use transparent PNG for sprites, consistent canvas size and padding, and crisp pixel edges. Suggested first trial: 96×96 canvas; confirm scale with one approved creature before producing a batch. Keep faces and silhouettes legible at the 54px card size. Artwork is contained rather than cropped. Preserve approved artwork and identities.

`design/sprite-inventory.json` lists 104 slots for review, not 104 missing sprites. Some Watamon already have embedded artwork. Review those before commissioning replacements. Start with a small set of missing creatures, one item and one practice to establish proportions.

Run `node scripts/check-preview.cjs` after edits. Empty manifest slots keep existing fallback icons. Creature overrides appear in both cards and detail banners through the existing renderer. Item and practice overrides currently appear on cards; their detail layouts retain semantic icons.

This is a local review candidate. Before release: mobile viewport review, service-worker asset/version update, image payload optimization, and production acceptance checks. Do not deploy on the strength of this file.
