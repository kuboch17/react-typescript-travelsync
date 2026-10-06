# TripSync

Trip planner built with React, TypeScript, and Vite.

![TripSync](docs/screenshot-desktop.jpg)

## Features

- Create, edit, and delete trips.
- Add activities with a place, category, notes, and cost.
- Vote, search, filter, and sort ideas.
- Schedule activities and view a daily itinerary.
- Save data in the browser and export JSON.

This is a local demo. Voting identities are simulated; accounts, shared data, and realtime sync are not implemented. Costs are per person in EUR. JSON export has no import UI.

## Setup

Node.js 22.12+ and pnpm 10.11.0.

```sh
git clone https://github.com/kuboch17/react-typescript-travelsync.git
cd react-typescript-travelsync
pnpm install --frozen-lockfile
pnpm dev
```

## Checks

```sh
pnpm test
pnpm build
pnpm preview
```

Tests cover planning rules, persistence, and user workflows. GitHub Actions runs tests and the production build.

## Structure

- `src/components` — cards, forms, dialogs
- `src/domain` — TypeScript types, Zod validation, immutable state changes
- `src/data` — sample data and browser storage
- `src/hooks` — React state and persistence

[Architecture and Firebase roadmap](docs/ARCHITECTURE.md)

## Deployment

Build with `pnpm build` and serve `dist/` on a static host. No backend is required.

## License

[MIT](LICENSE)
