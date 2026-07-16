---
name: verify
description: Build, launch, and drive Woodshed locally to verify changes end-to-end in a real browser.
---

# Verifying Woodshed changes

## Launch

```bash
npm run dev   # background; port 3000 is often taken → Next falls back to 3002. Read the task output for "Local: http://localhost:PORT".
```

`.env` ships with `AUTH_DEV_LOGIN=1`: on `/login`, fill the "Dev User" textbox with any name and click **Dev Login** (creates a fake account). A brand-new account is redirected to `/onboarding` — fill a handle and Continue before you can reach `/licks/new`.

## Driving (chrome-devtools MCP)

- If `new_page` fails with "browser already running for …/chrome-devtools-mcp/chrome-profile", kill the stale automation Chrome: `pkill -f "chrome-devtools-mcp/chrome-profile"` (never plain `pkill Chrome` — that would hit the user's browser).
- The TAB editor cells are buttons named `string-<s>-col-<c>` (s: 0=low E … 5=high e). Click a cell, then `press_key` digits, then Enter. Articulation keys: `h p / \ b ~` before Enter.
- React controlled inputs (BPM slider, title): the MCP `fill` tool does NOT stick — set the value with the native setter and dispatch `input`:
  ```js
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(el, "200"); el.dispatchEvent(new Event("input", { bubbles: true }));
  ```
- **Timing gotcha:** MCP round-trips (incl. model latency) are often > 5 s, so anything you want to observe mid-playback must be orchestrated inside ONE `evaluate_script` (arm a `setInterval` sampler → `btn.click()` → `await` → return the timeline). A screenshot call issued after a "start playback" call will usually arrive after playback finished; to screenshot mid-state, arm an auto-restart loop in the page first.
- Playback observables: play button `aria-label` "Play lick"/"Stop playback" (ko: "Lick 재생"/"재생 정지"); playhead is the only `svg rect` in TabStaff — `x = column * 46` (non-compact `COL_W`).
- AudioContext can be captured for state assertions by wrapping the constructor BEFORE first play: `window.__ctxs=[]; window.AudioContext = class extends AudioContext { constructor(...a){ super(...a); window.__ctxs.push(this); } }`. A CDP trusted click grants user activation, so `ctx.state === "running"` after the first play click.

## Flows worth driving

- `/licks/new` — editor + live TabView preview (PlayButton lives in the preview).
- Save (title required) → redirects to `/licks/<id>` detail page (second TabView surface).
- Locale: `document.cookie = "locale=ko; path=/"` + reload flips the UI to Korean.

## Gotchas

- `npx tsc --noEmit` has 27 pre-existing errors in `src/lib/db/licks.test.ts` / `moderation.test.ts` (LickInput fixtures missing youtubeUrl/audioUrl) — judge "no NEW errors", not exit code (as of 2026-07).
- Dev data lands in `local.db`; verification licks/accounts are harmless leftovers.
