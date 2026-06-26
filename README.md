# adobe-commerce-partnerships-ref-app

A Next.js ordering interface for Adobe direct partners, built on VIP Marketplace (VIP MP) APIs.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [Docker](#docker)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Contributing](#contributing)

## Features

- **Customer management** — browse resellers, view and create end customers
- **Ordering** — place new orders from the VIP MP pricelist
- **Renewals** — manage auto-renewals, late renewals, and upcoming renewal edits
- **Three Year Commit (3YC)** — initiate and manage 3YC for end customers
- **Subscriptions** — view and manage customer subscriptions and purchase history
- API proxy routes that delegate to the VIP MP partner API
- MVC architecture with Zod-validated models and centralized error handling
- Data fetching and caching with [TanStack Query](https://tanstack.com/query/latest)
- TypeScript throughout
- Docker support for containerized deployment

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **npm** (included with Node.js)

## Getting Started

```bash
git clone <repository-url>
cd adobe-commerce-partnerships-ref-app
npm install
cp .env.sample .env
```

Edit `.env` and fill in the required values (see [Configuration](#configuration)), then start the dev server:

```bash
npm run dev:local
```

The app will be available at [http://localhost:9000](http://localhost:9000).

## Configuration

Copy `.env.sample` to `.env` and set the following variables:

| Variable                | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| `NODE_ENV`              | Runtime environment (`development` / `production`)        |
| `PARTNER_API_BASE_URL`  | Base URL for the external partner/reseller API            |
| `IMS_TOKEN_URL`         | OAuth token endpoint                                      |
| `PARTNER_CLIENT_ID`     | OAuth client ID                                           |
| `PARTNER_CLIENT_SECRET` | OAuth client secret                                       |
| `PARTNER_NAME`          | Display name of the partner                               |
| `MARKET_SEGMENTS`       | JSON array of market segments, e.g. `["COM","EDU","GOV"]` |
| `CURRENCIES`            | JSON array of supported currencies, e.g. `["USD"]`        |
| `REGION`                | Region code, e.g. `NA`                                    |

## Development

```bash
npm run dev:local   # Start dev server with local env (port 9000)
npm run dev         # Standard Next.js dev server (port 3000)
npm run lint        # ESLint
npm run format      # Prettier (auto-fix)
npm run format:check  # Prettier (check only)
```

## Testing

The project uses Jest for both unit and integration tests.

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:unit         # Unit tests only
npm run test:unit:watch   # Unit tests in watch mode
npm run test:unit:coverage  # Unit test coverage
```

Tests live under `tests/` (integration) and `tests/unit/` (unit).

## Building for Production

```bash
npm run build
npm start
```

Or using the custom server:

```bash
npm run build
node server.js
```

## Docker

```bash
docker build -t adobe-commerce-partnerships-ref-app .
docker run --env-file .env -p 9000:9000 adobe-commerce-partnerships-ref-app
```

A `docker-compose.yml` is also provided:

```bash
docker compose up
```

## Project Structure

```
adobe-commerce-partnerships-ref-app/
├── pages/            # Next.js pages and API routes
│   └── api/          # API endpoints (thin controllers — parse, auth, delegate)
├── components/       # Reusable React UI components
├── models/           # Zod schemas, types, and data validation
├── controllers/      # Business logic and external API orchestration
├── contexts/         # React context providers
├── hooks/            # Custom React hooks
├── utils/            # Shared utilities (error handling, logging, etc.)
├── types/            # Shared TypeScript types
├── tests/            # Integration and unit tests
├── server.js         # Custom Express/Node server
├── next.config.js    # Next.js configuration
└── tsconfig.json     # TypeScript configuration
```

## Architecture

adobe-commerce-partnerships-ref-app follows an MVC pattern adapted for Next.js. See [ARCHITECTURE.md](ARCHITECTURE.md) for a full breakdown of the layers, error handling strategy, and how to extend the application.

## Contributing

Contributions are welcome! Please open an issue to discuss what you'd like to change before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and add tests where appropriate
4. Ensure `npm run lint` and `npm test` pass
5. Open a pull request against `develop`

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.
