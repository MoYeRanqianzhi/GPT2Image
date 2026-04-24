# GPT2IMAGE — Contributor Guide

A chat-to-image web app built with Vite + React + TypeScript.

## Project

- **Stack**: Vite 8, React 19, TypeScript 6, Zustand, React Router v7
- **Design**: Claude-inspired elegance with GPT's minimalist black & white palette (see DESIGN.md)
- **Build**: `npm install && npm run build` — output in `dist/`

## Branch Strategy

- `dev` — development and testing. All work goes here.
- `main` — production. Merge to main only via explicit release.

## Code Conventions

- No comments unless the *why* is non-obvious. Code should be self-documenting.
- No unused imports, dead code, or placeholder TODOs in committed code.
- Prefer editing existing files over creating new ones.
- Follow existing patterns — check similar components before introducing new abstractions.

## Commit Style

- Commit frequently with descriptive messages: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`
- Tag significant milestones.

## Structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Router + providers
├── types.ts              # Shared TypeScript interfaces
├── lib/                  # Core modules (store, api, theme, markdown)
├── components/           # Reusable UI components
├── pages/                # Route-level page components
└── styles/globals.css    # Design tokens + all styles
```
