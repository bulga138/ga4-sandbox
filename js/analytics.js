/**
 * GA4 Tagging Sandbox — Analytics core
 * ------------------------------------
 * Loads (or simulates) the gtag loader, exposes a safe `track()` API,
 * a global event log bus for the UI, consent + debug controls, and a URL parser.
 */
(() => {
  const { CONFIG, ENABLE_SEND, DEBUG_MODE, CAMPAIGN_PARAMS } = window.GA4;

  const ID_REGEX = /^G-[A-Z0-9]{6,}$/i;
  const IS_LIVE = ENABLE_SEND && ID_REGEX.test(CONFIG.MEASUREMENT_ID);

  const state = {
    send: ENABLE_SEND,
    live: IS_LIVE,
    consent: CONFIG.DEFAULT_CONSENT,
    debug: DEBUG_MODE,
    measurementId: CONFIG.MEASUREMENT_ID,
  };

  const listeners = new Set();

  /** Subscribe to the internal log bus. cb({ type, ... }) */
  function on(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function notify(payload) {
    listeners.forEach(cb => cb({ ...payload, ts: Date.now() }));
  }

  /**
   * Unified gtag shim. Every call is pushed to the real dataLayer (so a real
   * loader picks it up when live) AND broadcast to the log bus.
   */
  function gtag(...args) {
    window.dataLayer.push(arguments);
    notify({ type: 'gtag', args });
  }

  function loadLoader() {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${state.measurementId}`;
    s.onerror = () => {
      console.error(`[GA4] Failed to load gtag.js for ${state.measurementId}. Check the ID and your network.`);
      notify({ type: 'error', message: `Failed to load gtag.js for ${state.measurementId}` });
    };
    document.head.appendChild(s);
    console.log(`[GA4] Loading gtag.js for ${state.measurementId}...`);
    interceptNetwork();
  }

  function interceptNetwork() {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url ?? '');
      if (url.includes('google-analytics.com') || url.includes('googletagmanager.com')) {
        console.log(`[GA4 NETWORK] fetch → ${url}`);
      }
      return originalFetch.apply(this, args);
    };

    if (navigator.sendBeacon) {
      const originalBeacon = navigator.sendBeacon;
      navigator.sendBeacon = function (url, data) {
        if (url.includes('google-analytics.com') || url.includes('googletagmanager.com')) {
          console.log(`[GA4 NETWORK] sendBeacon → ${url}`, data);
        }
        return originalBeacon.call(this, url, data);
      };
    }
  }

  function init() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = gtag;

    // Initial consent default (GA4 consent mode v2)
    gtag('consent', 'default', {
      analytics_storage: state.consent,
      ad_storage: 'denied',
      personalization_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });

    if (state.live) {
      loadLoader();
      gtag('js', new Date());
      gtag('config', state.measurementId, { debug_mode: state.debug });
    }

    notify({
      type: 'init',
      live: state.live,
      send: state.send,
      debug: state.debug,
      measurementId: state.measurementId,
      reason: state.live
        ? 'Live mode — events sent to GA4.'
        : 'Sandbox mode — events logged only. Set ?send=1 (or fill MEASUREMENT_ID + DEFAULT_ENABLE_SEND) to send.',
    });
  }

  /**
   * Fire a custom event. Adds GA4-default params when ENRICH_DEFAULTS is on.
   * @param {string} name  Event name (must exist in EVENTS registry, else warn).
   * @param {object} [params]  Event parameters.
   */
  function track(name, params = {}) {
    const registry = window.GA4.EVENTS[name];
    if (!registry) {
      console.warn(`[GA4] Event "${name}" is not in the EVENTS registry.`);
    }

    const payload = { ...params };
    if (CONFIG.ENRICH_DEFAULTS) {
      payload.page_location = window.location.href;
      payload.page_path = window.location.pathname + window.location.search;
    }

    gtag('event', name, payload);
    return payload;
  }

  /** Update consent. value: "granted" | "denied" */
  function setConsent(value) {
    state.consent = value;
    gtag('consent', 'update', {
      analytics_storage: value,
      ad_storage: value === 'granted' ? 'denied' : 'denied',
    });
    notify({ type: 'consent', value });
  }

  /** Toggle debug_mode live via gtag config (no reload needed). */
  function setDebug(value) {
    state.debug = value;
    if (state.live) {
      gtag('config', state.measurementId, { debug_mode: value });
    }
    notify({ type: 'debug', value });
  }

  /** Parse current URL into path, hash, params and detected campaign params. */
  function parseURL() {
    const u = new URL(window.location.href);
    const params = {};
    u.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const campaign = {};
    CAMPAIGN_PARAMS.forEach(p => {
      if (u.searchParams.has(p)) campaign[p] = u.searchParams.get(p);
    });

    return {
      pathname: u.pathname,
      hash: u.hash,
      params,
      campaign,
      hasCampaign: Object.keys(campaign).length > 0,
    };
  }

  window.Analytics = {
    init,
    loadLoader,
    track,
    setConsent,
    setDebug,
    parseURL,
    on,
    state,
  };
})();
