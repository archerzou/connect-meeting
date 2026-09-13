# CalConnect Web

Frontend for the CalConnect meeting-scheduling API — clean, simple UI built with React + Tailwind v4 + shadcn/ui.

## Tech stack

| Concern | Library |
| --- | --- |
| Build | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Components | shadcn/ui (Radix primitives) |
| Routing | React Router v7 |
| Server state | TanStack Query |
| Auth/client state | Zustand (persisted) |
| Forms + validation | React Hook Form + Zod |
| HTTP | Axios (JWT + auto-refresh interceptor) |
| Dates/durations | Luxon + TimeSpan helpers |
| Toasts | Sonner |

## Getting started

Run the whole stack (recommended) from the repo root:

```bash
docker compose up -d --build   # UI at http://localhost:4173, API at http://localhost:5000
```

Or run the frontend on its own against a running API:

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

The dev server proxies `/api/*` to the backend at `http://localhost:5000`. In
Docker, nginx serves the built app and reverse-proxies `/api` to the API
container (`API_UPSTREAM`), so the browser talks to a single origin (no CORS).

## API integration

Everything is live against the backend — there is no mock layer:

- **Auth** (`src/api/auth.ts`): register, email verification, login (silent token
  refresh), profile view/update, revoke sessions.
- **Meetings** (`src/api/meetings.ts`): list, detail, create, update, reschedule,
  cancel, invite/remove participant, RSVP.
- **Users** (`src/api/users.ts`): search (participant picker) + id lookup (names).

The API serializes enums as strings and durations as `HH:mm:ss`; the client maps
those to its union types and minute-based helpers (`src/lib/duration.ts`).

## Pages

- `/login`, `/register`, `/verify-email` — auth (email-verification gated)
- `/` — calendar/agenda of meetings, filter by type
- `/meetings/new` — 4-step wizard enforcing duration/role/agenda policies
- `/meetings/:id` — agenda, participants, RSVP, invite/remove, reschedule, edit, cancel
- `/profile`, `/security` — profile edit, sign out everywhere

## Domain rules encoded in the UI (`src/domain/meeting.ts`)

- **Duration policy per type**: Standard 15m–2h, Workshop 1h–4h, Decision-making 30m–1.5h
- **Capacity**: Standard 20, Workshop 30, Decision-making 10
- **Roles**: Workshop excludes decision-makers; Decision-making is decision-makers only; Organizer & Facilitator are unique
- **Agenda** total can't exceed the meeting duration
- **Responses**: Pending / Accepted / Declined / Tentative (organizer auto-accepted)
