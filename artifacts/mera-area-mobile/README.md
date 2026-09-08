# Mera Area

Mera Area is a mobile-first local-language community app for India. Neighbors can ask questions, share local knowledge, mark problems solved, earn points, and celebrate helpful people in their locality.

## Current MVP

This Expo build is intentionally usable without external services:

- English / Hindi onboarding
- Email + password first-run flow (demo mode)
- Locality-based seeded feed
- Search and category filters
- Create a problem with text, photo, and optional voice note
- Answers, helpful votes, solve flow, points, badges, and streak
- Locality leaderboard
- Report post / answer and block user
- Community care moderation view
- AsyncStorage persistence for demo data
- Accessible labels, keyboard-aware forms, haptics, loading and empty states

The first-run demo data lives on the device. Use **Reset demo data** in your profile to return to onboarding.

## Run locally

```bash
pnpm install
pnpm --filter @workspace/mera-area-mobile run dev
```

Open the Expo preview or scan the QR code with Expo Go.

## Supabase production setup

The app is ready to move from the local provider to Supabase. Copy `.env.example` to your local environment and add:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Before wiring the production provider, apply the SQL in `supabase/migrations/001_initial.sql` and optionally load `supabase/seed.sql`. The policies are written for Supabase Auth users and keep profile, posts, answers, votes, reports, and badges scoped to the correct locality and user.

The current demo provider is kept as the default so the product remains previewable for stakeholders even when Supabase variables are missing.

## Project notes

- The mobile artifact uses Expo Router and AsyncStorage for the first build.
- Voice notes use Expo AV with the device microphone permission.
- Supabase auth is intentionally not required to preview the MVP. The onboarding form is the seam for replacing the local demo identity with Supabase email/password and later phone OTP.
- Never commit `.env` files or real Supabase keys.
