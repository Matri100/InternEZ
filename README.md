# InternEZ — v0.5

**EZ** — Easy, and European Zone. Fill out one profile, apply to internships in minutes — for applicants. Post listings and review who applied — for companies. InternEZ covers the EU/EEA (and Switzerland) exclusively; no other region is in scope, on purpose. One React/Vite frontend serving both, one Express/TypeScript backend, in-memory data store shaped for a drop-in Postgres swap.

## Run it

**One command**, from the repo root (installs both projects' dependencies the first time, then starts both dev servers together in one terminal, color-coded per process):

```bash
npm run install:all
npm run dev
```

In VS Code, this also runs as a task — open the folder and it starts automatically (VS Code will ask to confirm automatic tasks the first time; that's normal). To run just one side, or restart one without killing the other, use **Terminal → Run Task** and pick "InternEZ: Backend only" or "InternEZ: Frontend only" (see `.vscode/tasks.json`).

**Or, two terminals**, if you'd rather keep each server's output separate:

```bash
cd backend && npm install && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

Backend runs on `http://localhost:4000`, frontend on `http://localhost:5173` (proxies `/api` to the backend). No env vars or API keys required.

Note: `package.json` at the repo root is a thin convenience wrapper only (just the `concurrently` dependency) — `backend/` and `frontend/` remain two fully separate npm projects with their own `package.json` and `node_modules`, not an npm workspace.

## Structure

- `backend/src/routes` — `/profile`, `/listings`, `/applications`, `/reference` (applicant-facing) and `/company` (company profile + listing CRUD + received applications)
- `backend/src/services` — `eligibility.ts` (citizenship/region rules) and `matching.ts` (11-factor weighted compatibility score + generated explanation), both pure functions, unit-testable
- `backend/src/models/store.ts` — in-memory data access layer; every method is `async` so swapping in real Postgres later only touches this file
- `backend/src/data` — seed listings (eight companies) and reference data (regions, fields, skills, languages, qualifications, etc.)
- `frontend/src/pages` — applicant: Profile (12 sections), Browse, ListingDetail, Applications. Company: CompanyProfile, PostListing (create/edit), CompanyDashboard, CompanyApplicants. Plus a standalone `Landing` page at `/`.
- `frontend/src/components` — EligibilityFlag, MatchBar, MatchSummary, ChipGroup, SearchableMultiSelect (multi-value), SearchableSelect (single-value, e.g. university), MonthYearPicker, YearSelect, LanguageProficiencyEditor, RequiredLanguageEditor, TextListEditor, EduEntryForm, WorkEntryForm, ProjectEntryForm, CertificationEntryForm, DocumentsEditor, LogoUploadField, CompanyLogo, ApplyModal, ListingCard, MetaRow
- `frontend/src/context` — `AppData` (applicant profile + shared reference data), `CompanyData` (company profile), `AppMode` (remembers the last-chosen side for the root route; the topbar nav itself derives from the URL, not this)
- `frontend/src/styles/global.css` — design tokens (light/dark via CSS custom properties), typography (Fraunces + IBM Plex Sans/Mono)

## EU/EEA-only scope

Every country-driven part of the app — citizenship/birth/residence/preferred-location pickers, education/work-experience country, company HQ, listing location and eligibility rules — is constrained to a single `CountryCode` union covering the 27 EU member states, the three non-EU EEA states (Iceland, Liechtenstein, Norway), and Switzerland (bilateral agreements, not EEA, but grouped in by the same convention this app has used since v1). That's 31 countries, one `RegionCode` value (`"EU"`), one `RegionDef` in `REGIONS`.

This was a deliberate narrowing, not an oversight — `eligibility.ts` and `matching.ts` are both written generically against "does this country belong to an allowed region," so collapsing five regions down to one required zero logic changes, only data changes (backend/src/types/domain.ts, backend/src/data/reference.ts, and a re-filtered `universities.json`). Two seed listings that predated the narrowing (a US defense contractor, a UK analytics firm) were relocated to France and Ireland respectively rather than dropped, so the "citizen-only + clearance" and "single-country eligibility" scenarios are still represented.

## Profile sections

Contact → Eligibility background → Education (repeatable, university picked from a closed per-country list, "Other (not listed)" fallback) → Work experience (repeatable) → Projects (repeatable) → Certifications (repeatable) → Availability & preferences (custom month/year popover, not the native `<input type="month">`) → Languages (language + proficiency level rows) → Skills (searchable, ~9,100 options across 146 categories) → Career interests & qualifications (expanded chip lists) → Files (ID photo / resume / transcript / certificate, stored as base64 in-memory — see below) → Summary (a few sentences of self-description, not a resume dump).

## Reference data sources

Skills and universities are sourced from real open datasets rather than hand-authored lists, so the picker options are genuinely comprehensive instead of just "the well-known handful":

- **Universities** (`backend/src/data/universities.json`, ~1,720 institutions across the 31 supported EU/EEA + Switzerland countries) — [Hipo/university-domains-list](https://github.com/Hipo/university-domains-list), MIT licensed. Served on demand per country via `GET /api/reference/universities/:country` rather than inlined in the main reference payload, since fetching every country's list upfront isn't necessary.
- **Skills** (`backend/src/data/skill-groups-onet.json` + `core-groups.json`, ~8,960 technology/tool names across 135 categories, plus O*NET's 35 standard work skills and 33 knowledge areas) — O*NET 29.2 Database, produced by the National Center for O*NET Development under a grant from the U.S. Department of Labor, Employment and Training Administration, licensed CC BY 4.0 ([onetcenter.org/database.html](https://www.onetcenter.org/database.html)). Merged with the hand-curated `SKILL_GROUPS` in `reference.ts`, with exact-duplicate names dropped so nothing appears twice in the picker.

Both datasets are filtered/deduplicated once and committed as static JSON — no network call happens at runtime, so the app stays fully offline-capable and the "no API keys required" guarantee holds.

## Matching engine

`computeMatch` scores every listing 0–100 across 11 weighted factors — field of study (22), skills & experience (18), availability (10), preferred duration (6), location preference (8), work arrangement (6), language requirements (8), required education level (6), citizenship/work-authorization eligibility (8), career interests (5), preferred qualifications (3) — and generates a short plain-language explanation from whichever factors scored strongest/weakest. A factor a user hasn't given data for (e.g. no location preference set) is marked `neutral` and falls back to a mid-range default rather than being penalized to zero.

## Company mode

The topbar's Applicant/Company switch (top right) swaps the whole app between the two experiences. Like the applicant side, auth is out of scope for this MVP: every request acts as one mock company account (`CURRENT_COMPANY_ID` in `backend/src/routes/session.ts`), separate from the mock applicant. A company:

1. Fills out **Company profile** (name, logo, description, HQ, size) — `verified` is never self-settable, it's a platform decision.
2. **Posts a listing** through an 8-section form covering every field the matching engine and eligibility checker use — target fields, skills, required languages, eligibility rules (open to the EU/EEA, or citizen-of-one-country-only + optional clearance), industries, preferred qualifications, an optional extra question. Posted listings always have `origin: "direct"` and show up immediately in the applicant-side Browse feed.
3. Manages listings from **My listings** (edit/delete), and sees everyone who applied — across all their listings — in **Applicants**, with each applicant's primary education, skills, contact info, and any extra-question answer.

Ownership is enforced server-side: every `/api/company/listings/:id` write checks `companyId` before touching a listing, so one mock company can never edit or delete another's.

## Design

Flat, saturated ultramarine blue as the single functional accent (buttons, links, focus, selection) — deliberately in the EU institutional-blue family without literally reproducing the flag (no circle-of-stars, no navy/yellow banner striping). A muted gold exists as a second, purely decorative accent reserved for the landing page only, so it never collides with the functional blue or the status colors (green/amber/red for eligibility, untouched by either brand accent). No gradients anywhere — gradients are themselves one of the most recognizable "AI-generated UI" tells. Typography stays Fraunces (serif, headings) + IBM Plex Sans/Mono (UI/data), chosen originally to avoid the Inter-everywhere default and still doing that job.

## What's stubbed for this MVP

- Auth: every request acts as one mock applicant and one mock company (`backend/src/routes/session.ts`) — no real accounts, no login, no multi-tenant support (one company session, not N companies each with their own login)
- Resume/documents/logos: uploaded as base64 and live in the in-memory store — fine for a prototype, but a real deployment should move this to object storage (S3-compatible) rather than inlining files into records
- Verification badges are hardcoded on the seed companies; the mock company's own profile always starts `verified: false` with no workflow to change that (there's no reviewer to grant it)
- The AGENT fetch pipeline and email notifications are still out of scope — see the build brief
