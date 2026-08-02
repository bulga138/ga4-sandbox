# GA4 Tagging Sandbox

A public, personal-info-free playground for testing **every Google Analytics 4 event type**: automatic, enhanced measurement, custom events with/without parameters, ecommerce funnel, hover/focus, video, and URL-driven events (UTM / query params).

> **No shared GA4 property exists.** GA4 has no public sandbox you can send events to.
> The page runs in **logging-only sandbox mode** out of the box — every `gtag()` call is printed to an on-page event log and the DevTools console, but nothing is sent anywhere. To actually see events in GA4 you need your **own free property** (no credit card) and your Measurement ID.

## Features

| Category            | Events                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic           | `page_view`, `session_start`, `scroll`, `engagement`, `click`, `file_download`, `form_start`, `form_submit`, `video_*`                              |
| Custom              | `search`, `sign_up`, `login`, `generate_lead`, `select_content`, `share`, `view_promotion`, `select_promotion`, `theme_toggled`, `navigation_click` |
| Ecommerce           | `view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`, `refund`                                                              |
| Custom/experimental | `element_hover`, `element_view`, `utm_triggered`, `query_param_test`, `test_event`                                                                  |
| Consent & Debug     | Consent mode v2 (`denied` by default), live `debug_mode` toggle for DebugView                                                                       |

## Architecture

Separated, modular, DRY, no hardcoding:

```
ga4-tagging-example/
├── index.html              # Semantic, accessible structure + [data-event] bindings
├── css/
│   └── style.css           # WCAG AAA design system (tokens only — all values in :root)
├── js/
│   ├── config.js           # SINGLE source of truth: MEASUREMENT_ID, EVENTS registry,
│   │                       #   ITEMS catalog, CAMPAIGN_PARAMS, SAMPLE_URLS, overrides
│   ├── analytics.js        # gtag shim/loader, track(), consent, debug, URL parser, log bus
│   └── main.js             # UI wiring, param builders, log renderer, video/scroll tracking
├── files/sample.txt        # Dummy download for the file_download event
├── .github/workflows/deploy-gh-pages.yml
├── .env.example
└── .gitignore
```

Design decisions:

- **No hardcoding** — every magic value lives in `js/config.js` (event registry, product items, campaign params) or as CSS custom properties in `:root`.
- **DRY** — one event registry drives docs, validation and logging; shared `ITEMS` feed all ecommerce events; a single `buildParams()` map handles parameter construction.
- **Declarative UI** — HTML elements opt in via `data-event="name"`, `data-mode="hover"`, `data-params='{...}'`, `data-view`. No inline `onclick`.
- **KISS** — vanilla JS, no build step for local dev. Open `index.html` directly.

## Run locally (no setup)

Open `index.html` in any browser, or serve it:

```bash
python -m http.server 8080
# or: npx serve .
```

## Go live (your own GA4 property)

1. Create a free property at [analytics.google.com](https://analytics.google.com) → Admin → **Create Property** → Web → add a Data Stream → copy the **Measurement ID** (`G-XXXXXXX`).
2. Open the site with your ID:
   - **Quickest**: `index.html?send=1&debug=1` after editing `js/config.js` → `MEASUREMENT_ID: "G-XXXXXXX"`.
   - Or set `DEFAULT_ENABLE_SEND: true` in `js/config.js`.
3. In GA4 → Reports → **Realtime** (or **DebugView** with the debug toggle on) and interact with the page.

### Runtime overrides (no edits needed)

| Query param                                       | Effect                                             |
| ------------------------------------------------- | -------------------------------------------------- |
| `?send=1` / `?send=0`                             | Force send on/off                                  |
| `?debug=1` / `?debug=0`                           | Force debug_mode on/off                            |
| `?utm_source=...&utm_medium=...&utm_campaign=...` | Demo campaign attribution → fires `utm_triggered`  |
| `?product=keyboard&color=black`                   | Demo query params → `query_param_test` echoes them |

## Deploy

### GitHub Pages (with GitHub Actions)

The Measurement ID is injected at build time from a GitHub Actions secret, so it never sits in a committed file.

1. Push this repo to GitHub.
2. In GitHub → **Settings → Pages → Source** → select **GitHub Actions**.
3. Add repo **secrets** in GitHub → Settings → Secrets and variables → Actions:
   - `GA4_MEASUREMENT_ID` — your `G-XXXXXXX`
4. The workflow `.github/workflows/deploy-gh-pages.yml` runs `node scripts/inject-config.mjs` at build → it replaces the placeholder in `js/config.js` with the secret value.
5. Push to `main` → deploys to production.
6. Open a PR → deploys to a preview environment.

> Note: the GA4 Measurement ID is **not a secret** (browsers must expose it to send hits). Injecting it at build time keeps it out of git history and lets one repo serve sandbox + live builds.

### Alternative — GitHub Pages (no secrets)

If you don't want to use secrets, commit your ID directly in `js/config.js` (set `DEFAULT_ENABLE_SEND: true`) or keep the placeholder and visit with `?send=1`.

1. Push to GitHub → **Settings → Pages → Source: GitHub Actions**.
2. Use the built-in `actions/configure-pages` + `actions/upload-pages-artifact` + `actions/deploy-pages` workflow with the repo root (or `dist/` if you run the inject script) as the artifact.

## Privacy notes

- No personal data is collected, stored, or sent. Forms accept fake values and events only send what the button/params define.
- Default consent is `denied` (Consent Mode v2) — nothing is recorded until you grant it.
- The on-page log shows exactly what would be sent before anything goes anywhere.

## What would be wrong

- Claiming there's a shared/free GA4 property to send to (there isn't).
- Hardcoding a fake `G-` ID that silently fails (the sandbox keeps the placeholder and logs-only mode until a valid ID + `?send=1`).
- Sending real user PII through a public demo.
