# Pathwise Claude Brief

## Project
- Repository: `nerdedi/pathwise`
- Stack: Next.js App Router, React 19, TypeScript, Supabase, Vitest, Playwright
- Goal: accessibility-first trip planning app with sensory-aware itineraries, social stories, transport/weather guidance, and collaboration.

## What matters most
- Personalized itineraries are generated from venue and sensory-profile inputs.
- Social stories are editable frame-by-frame and must remain safe, inclusive, and non-infringing.
- Collaboration supports owner/editor/viewer permissions.
- Public shared guides are read-only.

## Current hardening status
- `PUT /api/guides/[id]` rejects unsafe or copyright-risk social-story text.
- `PUT /api/guides/[id]` rejects unsupported social-story image sources.
- `POST /api/social-story/assist` is rate limited and falls back on unsafe/copyright-risk output.
- Tests, lint, build, and Playwright smoke currently pass on `main`.

## Constraints for changes
- Preserve strict TypeScript types and existing API contracts.
- Do not weaken safety moderation.
- Keep accessibility and inclusive language first.
- Prefer minimal patches and update tests with behavior changes.

## Suggested order for reading
1. `package.json`
2. `src/types/itinerary.ts`
3. `src/lib/social-story.ts`
4. `src/lib/collaboration.ts`
5. `src/app/api/guides/[id]/route.ts`
6. `src/app/api/social-story/assist/route.ts`
7. `src/components/social-story/social-story-viewer.tsx`
8. `src/components/itinerary/itinerary-view.tsx`
9. relevant tests
