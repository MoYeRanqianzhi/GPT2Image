# GPT2IMAGE — Agent Instructions

Guidelines for AI coding agents contributing to this project.

## Context

GPT2IMAGE is a chat-to-image web app. Users configure an OpenAI-compatible API endpoint, then generate images through conversation. The app has 6 views: Landing, Chat, Gallery, History, Waterfall (batch generation), and Settings.

## Tech Stack

Vite + React 19 + TypeScript + Zustand + React Router v7 (HashRouter) + lucide-react icons.

## Rules

- **Branch**: Work on `dev`. Never push to `main` without explicit instruction.
- **Commit often**: Small, focused commits with conventional prefixes (`feat:`, `fix:`, `refactor:`).
- **Design fidelity**: See `DESIGN.md` for color and style constraints. Do not alter the visual identity.
- **Icons**: Use `lucide-react`. No emoji as icons. No hand-written SVG unless lucide lacks the icon.
- **CSS**: Global class names in `src/styles/globals.css`. Match existing naming patterns.
- **No guessing**: If uncertain about a technical detail, verify before acting.
- **No bloat**: No features, abstractions, or error handling beyond what the task requires.
