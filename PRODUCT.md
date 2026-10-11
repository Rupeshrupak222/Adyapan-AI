# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: engineering students preparing for campus placements — working through aptitude, DSA/coding practice, mock interviews, and resume improvement as part of their job search.

Secondary: placement coordinators and institutions, who track and manage student cohorts (offered via the Campus Partner tier on the landing page).

## Product Purpose

An all-in-one placement and learning platform: job discovery, DSA/coding practice with an AI judge, aptitude training, technical/HR interview simulation, resume analysis, and progress tracking in a single system. Success means a student becomes measurably placement-ready and lands a job; coordinators can run placement preparation at cohort scale.

## Positioning

Consolidation plus evaluation: one platform that covers the whole placement-prep journey instead of scattered tools, with an AI judge (coding evaluation, interview engine, resume/ATS analysis) as the mechanism that gives feedback and a placement-readiness signal. A neighboring product could copy the feature list, but not the combined workflow with AI evaluation built into each step.

## Operating Context

- Web application: Next.js frontend + Express/Prisma backend, AI providers behind a fallback chain, code execution via a container service.
- Used in a high-stakes, time-boxed context: placement seasons, timed tests, proctored interview sessions.
- Subscription-gated features exist in the product (billing details in `docs/subscription-system.md`); the exact tier structure was not confirmed as a durable commitment in this session.

## Capabilities and Constraints

Confirmed:

- Job discovery/listings, DSA and coding practice with AI judging, aptitude engine, technical and HR interview practice with proctored sessions, resume/ATS analysis, study planning, progress and weak-topic analytics, admin console.
- Proctored interview sessions (fullscreen/tab-switch integrity checks) are committed product behavior.
- Dark and light themes; English UI.

Open decisions (recorded, not invented): monetization specifics (payment provider, currency, tier naming) were not confirmed as must-preserve facts in this session.

## Brand Commitments

- Name: **Adyapan AI**, operated by SR's Adyapan Edutech Pvt Ltd.
- Amber/orange accent on a dark base (`#f59e0b` → `#d97706`), light theme alternate; Inter + Space Grotesk type.
- Logo at `frontend/public/assets/logo.png`; mascot/3D character assets (`Adyapan-ai-character.webm`, `robo.png`).
- Landing tagline direction "One AI Operating System For Careers".
- These identity elements are binding for future work.

## Evidence on Hand

- Brand assets in `frontend/public/assets/` (logo, mascot video, hero image, feature thumbnails).
- Landing page copy, pricing table, and testimonials live in `frontend/src/app/page.tsx`.
- Subscription documentation in `docs/subscription-system.md`; DSA question datasets in `docs/`.
- Absences: no verified customer case studies, press, or benchmark documents in the repo. Future work must not fabricate testimonials, customers, or performance claims beyond what already exists in committed copy.

## Product Principles

1. Consolidate, don't fragment: new capability should reduce the number of tools a student juggles during placement season.
2. Feedback is the product: practice loops must return evaluation and a signal of readiness, not just content.
3. Preserve the committed identity: name, amber-on-dark visual language, and mascot assets are fixed unless the user changes them.
4. Session integrity is non-negotiable: proctoring and assessment honesty constraints outrank convenience features.
5. Placement outcomes frame every decision: features are judged by whether they move a student toward getting hired.
