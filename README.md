# Kaem Kaar

Kaem Kaar is a service marketplace for connecting people who need help with local workers. Hirers can publish jobs and review applications; workers can create profiles, find suitable work, apply for jobs, publish their availability, and communicate with hirers in real time.

The application is built as a responsive React web app and can also be packaged for Android with Capacitor.

## Features

- Google and Facebook sign-in through Supabase OAuth
- Role-based onboarding for workers and hirers
- Worker profiles with skills, location, expected daily pay, and avatar uploads
- Job creation, category filtering, location-aware discovery, and job details
- Worker applications with pending, accepted, and rejected states
- Direct and job-specific messaging
- Realtime updates for jobs and messages
- Worker availability listings
- Ratings and reviews for completed work
- Responsive navigation for desktop and mobile layouts
- Optional in-app assistant experience

## Technology

- React 18 with Vite
- React Router and TanStack Query
- Supabase Auth, PostgreSQL, Storage, and Realtime
- Tailwind CSS, Radix UI, and Lucide icons
- Leaflet and React Leaflet for map-based location experiences
- Capacitor 8 for Android packaging
- Vitest and Testing Library for tests

## Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project
- Android Studio and an Android SDK for native Android builds

## Getting started

1. Install dependencies:

	```bash
	npm install
	```

2. Create a local environment file named `.env.local` in the project root:

	```dotenv
	VITE_SUPABASE_URL=https://your-project.supabase.co
	VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
	```

	Only the Supabase project URL and publishable key belong in the client environment. Do not expose a Supabase service-role key in this application.

3. Apply [`supabase/new.sql`](supabase/new.sql) to the Supabase project. The migration creates profiles, jobs, applications, messages, reviews, worker availability, avatar storage policies, row-level security policies, the new-user profile trigger, and realtime publication entries.

4. Start the development server:

	```bash
	npm run dev
	```

	Open the URL printed by Vite, usually `http://localhost:5173`.

## Supabase authentication

In the Supabase dashboard:

1. Enable Google and Facebook under **Authentication > Providers** and configure each provider's credentials.
2. Set **Authentication > URL Configuration > Site URL** to the production app origin, for example `https://your-deployed-domain.example/`. Do not leave this set to a localhost URL.
3. Add the local URL, every deployed app origin, and the Android callback URI under **Authentication > URL Configuration > Redirect URLs**:

	```text
	http://localhost:5173/
	https://your-deployed-domain.example/
	 com.kaemkaar.app://auth/callback
	```

	The client uses the PKCE flow and does not collect or store passwords. Web OAuth redirects to the current app origin followed by `/`; Android OAuth returns through `com.kaemkaar.app://auth/callback`, which reopens the APK. The Google and Facebook provider callback URL should remain Supabase's callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`); the app redirect URLs belong in Supabase's URL Configuration.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run build:dev` | Create a development-mode build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Android build

The Android project is configured with the application ID `com.kaemkaar.app` and reads web assets from `dist`.

```bash
npm run build
npx cap sync android
npx cap open android
```

Build and run the app from Android Studio, or use the Capacitor CLI with a connected device or emulator:

```bash
npx cap run android
```

## Project structure

```text
src/
  components/       Shared application and UI components
  contexts/         Authentication and theme providers
  integrations/     Supabase client integration
  lib/              Shared constants and utilities
  pages/            Routed application screens
supabase/
  new.sql           Database schema, policies, storage, and realtime setup
android/            Capacitor Android project
```

## License and usage

This repository contains proprietary Kaem Kaar Private Limited code. Reproducing, republishing, or using the code without authorization from Kaem Kaar officials is prohibited and may result in legal action.
