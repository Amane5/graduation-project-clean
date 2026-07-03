# Repository Guidelines

## Project Structure & Module Organization

This repository is a NestJS + TypeScript backend. Core application code lives in `src/`, organized by feature modules such as `auth`, `children`, `story`, `question`, `questions`, `challenge`, `analytics`, and `documents`. Each module typically keeps its controller, service, module, DTOs, and prompt files together. Shared code lives in `src/common` and `src/lib`. Database schema and migrations are under `prisma/`, helper scripts are in `scripts/`, and end-to-end tests live in `test/`.

## Build, Test, and Development Commands

Run commands from `graduation-project/`.

- `npm install` installs dependencies.
- `npm run start:dev` starts the API in watch mode for local development.
- `npm run build` compiles the server to `dist/`.
- `npm run start:prod` runs the compiled build.
- `npm run lint` runs ESLint with auto-fixes across `src/` and `test/`.
- `npm run format` formats TypeScript files with Prettier.
- `npm test` runs Jest unit tests.
- `npm run test:e2e` runs API-level tests from `test/jest-e2e.json`.
- `npm run test:cov` writes coverage output to `coverage/`.

## Coding Style & Naming Conventions

Use TypeScript and standard Nest naming: `*.module.ts`, `*.controller.ts`, `*.service.ts`, and `*.dto.ts`. Prefer PascalCase for classes and DTO types, camelCase for methods and variables, and kebab-case for migration names. Keep DTOs inside each feature's `dto/` folder. Follow the repo formatter rather than local editor defaults; ESLint uses `typescript-eslint` type-checked rules, with `no-floating-promises` and `no-unsafe-argument` set to warnings.

## Testing Guidelines

Unit tests should follow the `*.spec.ts` pattern under `src/`. End-to-end tests belong in `test/` and use `*.e2e-spec.ts`. Add or update tests whenever you change controller behavior, guards, validation, or service logic. Run `npm test` before submitting changes, and run `npm run test:e2e` when routes, DTOs, or persistence behavior change.

## Commit & Pull Request Guidelines

Recent commits use short, lowercase, hyphenated subjects such as `challenge-feature` and `add-drawing-story-feature`. Keep that style, but prefer specific messages over generic entries like `save-changes`. Pull requests should include a short summary, testing performed, related task or issue, and sample responses or screenshots for user-visible API changes. Call out Prisma schema or migration updates explicitly.

## Security & Configuration Tips

Do not commit `.env` values, API keys, Firebase credentials, or database secrets. Prisma reads `DATABASE_URL` from the environment via `prisma.config.ts`; document any new required variables in the PR. Review migrations carefully before merging, especially changes involving cascades or destructive schema updates.
