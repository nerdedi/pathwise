# Claude Lite Bundle Manifest

This bundle is intentionally small for limited upload/context budgets.

## Included files
- `package.json` — dependencies and scripts
- `tsconfig.json` — TypeScript setup
- `next.config.mjs` — Next.js config
- `README.md` — setup and product overview
- `src/types/itinerary.ts` — core domain types
- `src/lib/social-story.ts` — normalization, safety, storage sanitation
- `src/lib/social-story.test.ts` — regression coverage for social-story logic
- `src/lib/collaboration.ts` — permission and sharing logic
- `src/lib/itinerary-ai.ts` — itinerary generation glue
- `src/lib/prompts.ts` — LLM prompt definitions
- `src/lib/runtime-config.ts` — runtime checks/config behavior
- `src/app/api/guides/[id]/route.ts` — main persisted guide read/update/delete API
- `src/app/api/guides/[id]/route.test.ts` — hardening tests for guide saves
- `src/app/api/public-guides/[id]/route.ts` — public shared guide access
- `src/app/api/social-story/assist/route.ts` — social-story AI assist API
- `src/app/api/social-story/assist/route.test.ts` — assist safety tests
- `src/app/api/itinerary/route.ts` — itinerary generation API
- `src/components/social-story/social-story-viewer.tsx` — social-story editor/viewer UI
- `src/components/itinerary/itinerary-view.tsx` — main itinerary UI
- `src/app/plan/[id]/page.tsx` — primary plan detail page

## Not included
- `.env*`, secrets, build output, dependencies, test artifacts
- most secondary UI components and integration helpers

## Best use in Claude
Give Claude this bundle plus a specific task, and if needed attach one or two extra directly related files.
