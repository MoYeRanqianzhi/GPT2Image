# GPT2IMAGE Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Pure-frontend chat-to-image web app with settings, gallery, and history.

**Architecture:** Single-page app, vanilla HTML/CSS/JS. Browser calls Responses API directly. Config/history/images persisted in localStorage + IndexedDB.

**Tech Stack:** Vanilla HTML/CSS/JS, no build tools, no framework, no backend.

---

## File Structure

```
gpt2image/
  index.html              # Single HTML entry point
  css/
    style.css             # All styles + design tokens + animations
  js/
    icons.js              # SVG icon definitions (export functions returning SVG strings)
    store.js              # localStorage/IndexedDB persistence layer
    api.js                # Gateway API client (fetch-based)
    router.js             # Simple hash-based view router
    views/
      settings.js         # Settings form view
      landing.js          # Landing hero view (Create tab, empty state)
      chat.js             # Chat conversation view (Create tab, active state)
      gallery.js          # Gallery grid view
      history.js          # History list view
    components/
      header.js           # App header with tabs + gear icon
      input-bar.js        # Shared prompt input bar (landing + chat)
      image-card.js       # Image with hover overlay (download/edit/fullscreen)
      lightbox.js         # Fullscreen image viewer modal
      toast.js            # Error/success toast notifications
    app.js                # Bootstrap, wire everything together
```

---

### Task 1: Project scaffold + index.html + design tokens

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/app.js` (minimal bootstrap)

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GPT2IMAGE</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create css/style.css with design tokens and base reset**

All CSS variables from the design spec. Base reset. Typography. Utility classes.

- [ ] **Step 3: Create js/app.js minimal bootstrap**

Import router, render `#app`.

- [ ] **Step 4: Commit**

```bash
git add index.html css/ js/app.js
git commit -m "feat: project scaffold with design tokens"
```

---

### Task 2: SVG icons module

**Files:**
- Create: `js/icons.js`

All icons as functions returning SVG strings. Line-style, 24x24 viewBox, stroke-based, 1.5px stroke width.

Icons needed: settings/gear, plus, send/arrow-up, download, edit/pencil, fullscreen/expand, close/x, image, new/plus-circle, clock/history, grid/gallery, chevron-down, loader/spinner.

- [ ] **Step 1: Create js/icons.js with all icon functions**
- [ ] **Step 2: Commit**

---

### Task 3: Persistence layer (store.js)

**Files:**
- Create: `js/store.js`

Functions:
- `getConfig()` / `saveConfig({baseURL, apiKey, model})` — localStorage
- `getConversations()` / `saveConversation(conv)` / `deleteConversation(id)` — localStorage
- `getAllImages()` — aggregate from all conversations, sorted by date desc
- `generateId()` — simple unique ID generator

Conversation shape:
```js
{
  id: string,
  createdAt: number,
  messages: [
    { role: 'user', text: string, imageDataUrl?: string, timestamp: number },
    { role: 'assistant', imageBase64: string, size: string, timestamp: number }
  ]
}
```

- [ ] **Step 1: Create js/store.js**
- [ ] **Step 2: Commit**

---

### Task 4: API client (api.js)

**Files:**
- Create: `js/api.js`

Port the Responses API call logic from `generate_gateway_image.py` to browser fetch.

```js
export async function generateImage({ prompt, size, action, images }) {
  // Build Responses API payload
  // POST to {baseURL}/responses
  // Extract base64 from response output[].image_generation_call.result
  // Return { imageBase64, raw }
}
```

- [ ] **Step 1: Create js/api.js**
- [ ] **Step 2: Commit**

---

### Task 5: Router + Header + Toast components

**Files:**
- Create: `js/router.js`
- Create: `js/components/header.js`
- Create: `js/components/toast.js`

Hash-based router: `#settings`, `#create`, `#gallery`, `#history` (default: check config → settings or create).

Header: logo (G icon + "GPT2IMAGE"), tab pills (Create/Gallery/History), gear icon for settings.

Toast: slide-in notification for errors/success. Auto-dismiss after 4s.

- [ ] **Step 1: Create router.js, header.js, toast.js**
- [ ] **Step 2: Wire into app.js**
- [ ] **Step 3: Commit**

---

### Task 6: Settings view

**Files:**
- Create: `js/views/settings.js`

Full-screen centered form:
- API Base URL input (pre-filled `https://api.openai.com/v1`)
- API Key input (password type)
- Model input (default `gpt-5.4`)
- "Connect" button
- On save → store config, navigate to `#create`

- [ ] **Step 1: Create js/views/settings.js**
- [ ] **Step 2: Commit**

---

### Task 7: Input bar + Image card + Lightbox components

**Files:**
- Create: `js/components/input-bar.js`
- Create: `js/components/image-card.js`
- Create: `js/components/lightbox.js`

Input bar: attach (+) button, text input, size selector dropdown, send button. Emits `onSend({prompt, size, images})`.

Image card: renders image with CSS hover overlay — top-right download icon, bottom-left edit icon+label, bottom-right fullscreen icon. Top-left size badge on hover. All pure CSS `:hover`.

Lightbox: full-screen overlay with image, prompt text, close button (X), ESC to close.

- [ ] **Step 1: Create input-bar.js**
- [ ] **Step 2: Create image-card.js**
- [ ] **Step 3: Create lightbox.js**
- [ ] **Step 4: Commit**

---

### Task 8: Landing view (Create — empty state)

**Files:**
- Create: `js/views/landing.js`

Centered hero layout:
- "What would you like to create?" (Georgia serif heading)
- Subtitle
- Input bar component
- Quick suggestion chips
- Recent creations row (from store, last 4-8 images)

On send → create conversation in store, switch to chat view.

- [ ] **Step 1: Create js/views/landing.js**
- [ ] **Step 2: Commit**

---

### Task 9: Chat view (Create — active conversation)

**Files:**
- Create: `js/views/chat.js`

Conversation view:
- Scrollable message area (user bubbles right, AI image bubbles left)
- Each AI image uses image-card component
- Loading state with pulsing dot animation
- Input bar at bottom
- On send → call API, append to conversation, re-render
- Edit button → pre-fills image as reference, focuses input
- "+ New" in header → clear conversation, return to landing

- [ ] **Step 1: Create js/views/chat.js**
- [ ] **Step 2: Commit**

---

### Task 10: Gallery view

**Files:**
- Create: `js/views/gallery.js`

Grid of all generated images across conversations, newest first.
Each uses image-card component.
Click → lightbox with prompt text and conversation link.

- [ ] **Step 1: Create js/views/gallery.js**
- [ ] **Step 2: Commit**

---

### Task 11: History view

**Files:**
- Create: `js/views/history.js`

List of conversations:
- First prompt text (truncated ~80 chars)
- First image thumbnail
- Relative timestamp
- Delete button (with confirm)
- Click → navigate to `#create` with that conversation loaded

- [ ] **Step 1: Create js/views/history.js**
- [ ] **Step 2: Commit**

---

### Task 12: Integration, polish, and CSS animations

**Files:**
- Modify: `js/app.js` — final wiring
- Modify: `css/style.css` — transitions, animations, responsive

- Landing → Chat smooth CSS transition (opacity + transform)
- Loading spinner animation
- Toast slide-in/out
- Hover overlay fade-in
- Responsive: mobile-friendly input bar and layout
- Tag: `v0.1.0`

- [ ] **Step 1: Polish all CSS transitions and responsive behavior**
- [ ] **Step 2: Final commit + tag**

```bash
git tag v0.1.0 -m "GPT2IMAGE v0.1.0 — first working version"
```
