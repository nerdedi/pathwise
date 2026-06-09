# Pathwise

Pathwise helps neurodiverse and anxious visitors preview venues with calm, personalised guides.

## What it does

- Builds sensory-aware venue guides
- Adds weather and transport context
- Generates social stories and calming support content
- Supports Supabase-backed auth and saved guides

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Fill in the keys you actually use
3. Run the app with the normal Next.js scripts

## Health checks

- `npm run build`
- `npm run lint`
- `npm test`
- `GET /api/health` for a quick runtime-config snapshot

## Notes

- Use only placeholder values in the example env file.
- Keep real secrets in local-only environment files.
- The AI layer supports Groq first, then Gemini as a fallback.
