# GA4 Tagging Sandbox

A public, personal-info-free playground for testing **every Google Analytics 4 event type**: automatic, enhanced measurement, custom events with/without parameters, ecommerce funnel, hover/focus, video, and URL-driven events (UTM / query params).

## Features

| Category            | Events                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic           | `page_view`, `session_start`, `scroll`, `engagement`, `click`, `file_download`, `form_start`, `form_submit`, `video_*`                              |
| Custom              | `search`, `sign_up`, `login`, `generate_lead`, `select_content`, `share`, `view_promotion`, `select_promotion`, `theme_toggled`, `navigation_click` |
| Ecommerce           | `view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`, `refund`                                                              |
| Custom/experimental | `element_hover`, `element_view`, `utm_triggered`, `query_param_test`, `test_event`                                                                  |
| Consent & Debug     | Consent mode v2 (`denied` by default), live `debug_mode` toggle for DebugView                                                                       |

## Architecture

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

## Privacy notes

- No personal data is collected, stored, or sent. Forms accept fake values and events only send what the button/params define.
- The on-page log shows exactly what would be sent before anything goes anywhere.
