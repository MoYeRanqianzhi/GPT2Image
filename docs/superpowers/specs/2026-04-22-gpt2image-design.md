# GPT2IMAGE — Design Spec

## Overview

A web-based chat-to-image generation app. Node.js backend proxies API calls to protect credentials. Vanilla HTML/CSS/JS frontend with GPT-style minimalist black/white palette and Claude-inspired elegant design language.

## Architecture

```
Browser (Vanilla HTML/CSS/JS)
  ↕ fetch /api/*
Node.js (Express) Backend
  ↕ HTTPS POST
Gateway API (user-configured baseURL + /responses)
```

- **Backend**: Express server, serves static frontend, proxies image generation API calls
- **Frontend**: Single-page app with state-driven view switching (no framework)
- **Config**: User provides baseURL + apiKey on first visit; stored server-side in `data/config.json`
- **Images**: Generated images saved to `data/images/` with metadata in `data/history.json`

## Pages & States

### 1. Settings Page (first visit / no config)

Full-screen centered form on black background:
- baseURL input (pre-filled with `https://api.openai.com/v1`)
- API Key input (password field)
- Model name input (default: `gpt-5.4`)
- "Connect" button — validates by sending a lightweight request
- Settings accessible later via gear icon in header

### 2. Create — Landing State (no active conversation)

- Header: logo + Create/Gallery/History tabs + settings gear
- Centered hero: "What would you like to create?" (Georgia serif)
- Subtitle: "Describe any image and bring it to life"
- Input bar: attach button (+) | text input | size selector | send button
- Quick suggestion chips below input
- Recent creations thumbnails at bottom (from history)

### 3. Create — Chat State (active conversation)

Triggered after first prompt is sent. Smooth transition from landing.

- Header: logo + "+ New" button + Gallery/History tabs + settings gear
- Chat messages scroll area:
  - **User bubble** (right-aligned): text, optionally with attached reference image thumbnail
  - **AI bubble** (left-aligned): generated image in rounded container
- Image hover overlay (CSS-only, no JS needed):
  - Semi-transparent black backdrop (`rgba(0,0,0,0.35)`)
  - Top-left: size label (e.g. "1024×1024")
  - Top-right: download button (↓)
  - Bottom-left: edit button (✏️ Edit)
  - Bottom-right: fullscreen button (⛶)
  - Buttons: frosted glass style (`background:rgba(0,0,0,0.6)`, `border:1px solid rgba(255,255,255,0.15)`)
- Loading state: pulsing dot + "Generating..."
- Input bar at bottom (same as landing but placeholder changes to "Continue creating...")

### 4. Gallery Tab

- Grid of all generated images (masonry or uniform grid)
- Each image has hover overlay with same actions
- Filter/sort: by date (newest first)
- Click image → fullscreen lightbox with prompt text

### 5. History Tab

- List of past conversations, each showing:
  - First prompt text (truncated)
  - First generated image thumbnail
  - Timestamp
- Click → loads that conversation into Chat State

## API Endpoints (Backend)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/config` | Check if config exists (returns `{configured: bool}`) |
| POST | `/api/config` | Save baseURL + apiKey + model |
| POST | `/api/generate` | Proxy image generation to gateway |
| GET | `/api/history` | Get all conversations |
| GET | `/api/history/:id` | Get single conversation |
| DELETE | `/api/history/:id` | Delete conversation |
| GET | `/api/images/:filename` | Serve saved image files |

### POST /api/generate

Request body:
```json
{
  "prompt": "A mountain lake at sunset",
  "size": "1024x1024",
  "action": "auto",
  "images": ["base64 or data URL of reference images"],
  "conversationId": "optional, to continue a conversation"
}
```

Backend:
1. Reads config from `data/config.json`
2. Builds Responses API payload (same structure as `generate_gateway_image.py`)
3. POSTs to `{baseURL}/responses` with SSL fix (`set_ciphers` equivalent for Node.js)
4. Extracts base64 image from response
5. Saves image to `data/images/{timestamp}-{hash}.png`
6. Appends to conversation in `data/history.json`
7. Returns `{imageUrl, conversationId, timestamp}`

## Data Storage

```
data/
  config.json          # {baseURL, apiKey, model}
  history.json         # [{id, messages: [{role, content, imageUrl, timestamp}]}]
  images/              # saved PNG files
```

## Design Tokens (GPT Black/White + Claude Elegance)

| Token | Value | Use |
|-------|-------|-----|
| `--bg-primary` | `#0d0d0d` | Page background |
| `--bg-secondary` | `#141414` | Input/card background |
| `--bg-tertiary` | `#1a1a1a` | Elevated surfaces |
| `--bg-hover` | `#1e1e1e` | Hover states |
| `--border` | `#2a2a2a` | Borders |
| `--border-subtle` | `#1e1e1e` | Subtle borders |
| `--text-primary` | `#ffffff` | Primary text |
| `--text-secondary` | `#aaaaaa` | Secondary text |
| `--text-tertiary` | `#666666` | Tertiary/placeholder text |
| `--text-muted` | `#444444` | Muted text |
| `--accent` | `#ffffff` | Send button, primary actions |
| `--radius-sm` | `6px` | Small elements |
| `--radius-md` | `10px` | Buttons, inputs |
| `--radius-lg` | `14px` | Chat bubbles, cards |
| `--radius-xl` | `20px` | Large containers |
| `--font-serif` | `Georgia, 'Times New Roman', serif` | Hero headings |
| `--font-sans` | `system-ui, -apple-system, sans-serif` | UI text |

## Key Interactions

- **Landing → Chat**: CSS transition, hero fades out, chat area fades in
- **Image hover**: Pure CSS `:hover` on image container shows overlay
- **Fullscreen**: Lightbox modal overlay with ESC to close
- **Edit flow**: Click "Edit" → image URL pre-filled as reference, input focused
- **Size selector**: Dropdown or toggle (1024×1024, 1024×1536, 1536×1024)
- **+ New**: Clears current conversation, returns to landing state
- **Quick suggestions**: Click → fills input with suggestion text

## Error Handling

- API timeout: show toast "Generation timed out, please try again"
- API error: show error message in chat bubble style
- Network error: show reconnection indicator
- No config: redirect to settings page

## File Structure

```
gpt2image/
  server.js              # Express server
  package.json
  public/
    index.html           # Single page
    css/
      style.css          # All styles
    js/
      app.js             # Main app logic
      api.js             # API client
      state.js           # State management
      components.js      # UI components (chat, gallery, etc.)
  data/                  # Runtime data (gitignored)
    config.json
    history.json
    images/
```
