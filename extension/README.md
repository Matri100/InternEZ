# Envoy (extension)

Envoy is InternEZ's companion browser extension — a named assistant, not
an AI (see below), that fills known application-form fields on *any*
external site from your InternEZ profile, so you're not retyping your
name, education, and work history into every company's own form.

It only fills fields. It never clicks submit — you always review the
filled-in form yourself before applying, on the company's own site.

## What it does and doesn't do

- Matches form fields by their label/name/id/placeholder text against a
  fixed set of keyword rules (`src/fieldMatcher.js`) — no AI, no network
  call beyond fetching your own profile. Fully deterministic and free to
  run. "Envoy" is a name, not a claim about how it works — an AI-assisted
  version (for forms this keyword matching can't figure out) is a
  possible, distinct, later paid tier, not what ships today.
- Only fills empty fields — it never overwrites something you've already
  typed.
- Only runs when you click "Fill this page" in the popup. It is never
  injected automatically and doesn't watch pages you visit.
- Can't touch file upload fields (resumes, etc.) — browsers block scripts
  from setting those, by design, for every extension, not just this one.
  Use the PDF resume export from your InternEZ profile for that field.
- Fills real `<select>` dropdowns too, by fuzzy-matching the profile value
  against the option text (e.g. profile "Bachelor" → option "Bachelor's
  Degree") — see `findBestOptionValue` in `src/fieldMatcher.js`. Leaves
  the dropdown alone rather than guessing when nothing resembles it.
- Recognizes voluntary self-identification questions (gender identity,
  race/ethnicity, veteran status, disability status) — the equal-opportunity
  questions some US-headquartered companies' forms ask. This data is GDPR
  "special category" data, so it's opt-in on its own Profile section, kept
  out of the main profile entirely, and only ever sent to the extension if
  the applicant separately consents to that (see
  `backend/src/types/domain.ts` — `VoluntaryDisclosures`). When there's
  nothing to fill with — not answered, or answered without consent — the
  extension still auto-selects a "prefer not to say" style option if the
  form offers one (`findDeclineOptionValue`), since these questions are
  legally required to offer a decline option anyway. No data leaves
  InternEZ either way.

## Loading it (development / unpacked)

1. Open `chrome://extensions` (or the equivalent in another Chromium
   browser — Edge, Brave, etc. all support the same flow).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin it to the toolbar if you want it one click away.

## Connecting Envoy to your InternEZ account

1. In InternEZ, go to **Profile → Envoy** and click **Generate sync
   code**. It's shown once — copy it.
2. Open Envoy's popup and paste the code into **Connect**.
3. On any application page, click the Envoy icon, then **Fill this
   page**.

Regenerating the code (or clicking **Disconnect**, either in InternEZ or
in Envoy) invalidates the old one immediately.

## Project layout

- `manifest.json` — Manifest V3. Minimal permissions (`activeTab`,
  `scripting`, `storage`) — deliberately no `content_scripts` /
  broad host permissions, since it should never run without you
  clicking the button.
- `popup.html` / `src/popup.js` — the UI: pairing, and the "Fill this
  page" trigger. Fetches your profile from the InternEZ API using the
  stored token, then injects the two files below into the active tab.
- `src/fieldMatcher.js` — the actual matching logic. Plain functions
  (no import/export) so it can be injected as a classic script *and*
  required directly from the test file — see the comment at its top.
  This is the part worth getting right; it has its own test suite.
- `src/content.js` — the DOM-facing half: finds fillable fields on the
  page, builds descriptors, calls into `fieldMatcher.js`, and applies
  the plan using the browser's native input setter + a dispatched
  `input`/`change` event (needed so frameworks like React notice the
  change — plain `el.value = x` alone doesn't register with them).
- `test-form.html` — a local fixture used to verify the fill logic
  against a realistic form (a simulated React-controlled input, a
  couple of ordinary `<select>` dropdowns, and a voluntary
  self-identification section) without touching a real company's
  site. Not part of the shipped extension; nothing references it
  from `manifest.json`.

## Testing

```bash
npm install
npm test
```

Tests cover `fieldMatcher.js` only — the DOM-facing code in `content.js`
was verified by hand against `test-form.html` (open it in any browser,
inject the two scripts via devtools, call
`window.__internezFillForm(profile)`).

## Known limitations / next steps

- **Known-ATS field maps.** Greenhouse, Lever, Workday, etc. use
  consistent DOM structure across every company on them — dedicated
  selectors for each would catch fields the generic label-matching
  misses (e.g. a "Location (City)" field — InternEZ's own profile only
  collects country-level residence, not city, so there's nothing to
  fill there yet regardless of matching).
- **Production API origin.** `src/popup.js` points at
  `http://localhost:4000` and `manifest.json`'s `host_permissions`
  matches it — both need updating once InternEZ is deployed somewhere
  real.
- **Chrome Web Store packaging/review** — this is presently a dev-only,
  "Load unpacked" extension; publishing it is a separate step (icons,
  store listing, privacy disclosure, review process) not part of this
  MVP.
