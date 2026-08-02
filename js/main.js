/**
 * GA4 Tagging Sandbox — UI wiring & event bindings
 * -------------------------------------------------
 * Boots Analytics, renders the URL inspector and event log, binds every
 * [data-event] element, and wires theme / consent / debug / video / scroll UI.
 * Keeps handlers small and delegates param building to a shared map (DRY).
 */
(() => {
  const { CONFIG, EVENTS, ITEMS, SAMPLE_URLS } = window.GA4;
  const A = window.Analytics;

  /* ----------------------------------------------------------------
   * Theme toggle (from the WCAG AAA design system)
   * ---------------------------------------------------------------- */
  const html = document.documentElement;

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    document.getElementById('theme-label').textContent = theme === 'dark' ? 'Light' : 'Dark';
    document
      .getElementById('theme-toggle-btn')
      .setAttribute('aria-label', `Toggle between light and dark theme. Current: ${theme} mode`);
  }

  function toggleTheme() {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
    A.track('theme_toggled', { theme: next });
  }

  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) return applyTheme(saved);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  /* ----------------------------------------------------------------
   * URL inspector
   * ---------------------------------------------------------------- */
  function renderURL() {
    const u = A.parseURL();

    document.getElementById('url-path').textContent = u.pathname || '(empty)';
    document.getElementById('url-hash').textContent = u.hash || '(none)';

    const paramsEl = document.getElementById('url-params');
    paramsEl.innerHTML = '';
    const keys = Object.keys(u.params);
    if (keys.length === 0) {
      paramsEl.innerHTML = '<span class="empty-state">No query params. Click a sample URL below.</span>';
    } else {
      keys.forEach(k => {
        const row = document.createElement('div');
        row.className = 'kv-row';
        row.innerHTML =
          `<span class="kv-key">${escapeHtml(k)}</span>` + `<span class="kv-value">${escapeHtml(u.params[k])}</span>`;
        paramsEl.appendChild(row);
      });
    }

    const campEl = document.getElementById('url-campaign');
    campEl.innerHTML = '';
    const cKeys = Object.keys(u.campaign);
    if (cKeys.length === 0) {
      campEl.innerHTML = '<span class="empty-state">No campaign params detected.</span>';
    } else {
      cKeys.forEach(k => {
        const row = document.createElement('div');
        row.className = 'kv-row';
        row.innerHTML =
          `<span class="kv-key">${escapeHtml(k)}</span>` + `<span class="kv-value">${escapeHtml(u.campaign[k])}</span>`;
        campEl.appendChild(row);
      });
    }

    // If a campaign was present, reflect it in analytics automatically.
    if (u.hasCampaign) {
      A.track('utm_triggered', u.campaign);
    }
    return u;
  }

  function renderSampleUrls() {
    const container = document.getElementById('sample-urls');
    SAMPLE_URLS.forEach(s => {
      const a = document.createElement('a');
      a.className = 'btn btn-ghost';
      a.href = s.url;
      a.textContent = s.label;
      a.dataset.event = 'navigation_click';
      a.dataset.dest = s.url;
      container.appendChild(a);
    });
  }

  /* ----------------------------------------------------------------
   * Parameter builders — one builder per special event (DRY).
   * Plain buttons fall back to data-* attributes on the element.
   * ---------------------------------------------------------------- */
  const total = () => Math.round(ITEMS.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

  const builders = {
    search(el) {
      return { search_term: valueOf(el, 'search_term') };
    },
    sign_up(el) {
      return { method: valueOf(el, 'method') };
    },
    login(el) {
      return { method: valueOf(el, 'method') };
    },
    generate_lead(el) {
      return { value: total(), currency: 'USD' };
    },
    select_content(el) {
      return { content_type: 'product', item_id: ITEMS[0].item_id };
    },
    share(el) {
      return { method: 'twitter', content_type: 'page', item_id: ITEMS[0].item_id };
    },
    view_item() {
      return { currency: 'USD', value: total(), items: ITEMS };
    },
    add_to_cart() {
      return { currency: 'USD', value: total(), items: ITEMS };
    },
    begin_checkout() {
      return { currency: 'USD', value: total(), items: ITEMS };
    },
    add_payment_info() {
      return { currency: 'USD', value: total(), items: ITEMS };
    },
    purchase() {
      return {
        transaction_id: `T-${Date.now()}`,
        value: total(),
        tax: 5.0,
        shipping: 4.99,
        currency: 'USD',
        items: ITEMS,
      };
    },
    refund() {
      return { transaction_id: `T-${Date.now()}`, value: total(), currency: 'USD' };
    },
    file_download(el) {
      return { file_name: 'report.pdf', file_extension: 'pdf', link_url: el.href || 'index.html' };
    },
    query_param_test(el) {
      const u = A.parseURL();
      const key = el.dataset.paramKey || 'product';
      return { param_key: key, param_value: u.params[key] || '(not present)' };
    },
    test_event() {
      return { test_id: `id-${Date.now()}`, random: Math.random() };
    },
    navigation_click(el) {
      return { dest: el.dataset.dest };
    },
  };

  /** Build params for any element, falling back to its data-* attributes. */
  function buildParams(name, el) {
    if (builders[name]) return builders[name](el);

    const params = {};
    if (el.dataset && el.dataset.params) {
      try {
        Object.assign(params, JSON.parse(el.dataset.params));
      } catch {
        console.warn('[GA4] Invalid data-params JSON on element', el);
      }
    }
    if (el.textContent) {
      params.button_text = el.textContent.trim().slice(0, 60);
    }
    if (el.id) params.element_id = el.id;
    return params;
  }

  /* ----------------------------------------------------------------
   * Event binding
   * ---------------------------------------------------------------- */
  function dispatch(name, el) {
    const params = buildParams(name, el);
    A.track(name, params);
    flash(el);
  }

  function bindEvents() {
    document.querySelectorAll('[data-event]').forEach(el => {
      const name = el.dataset.event;

      if (el.tagName === 'FORM') {
        el.addEventListener('submit', e => {
          e.preventDefault();
          dispatch(name, el);
        });
        return;
      }

      const mode = el.dataset.mode || 'click';
      if (mode === 'hover') {
        const fire = () => dispatch(name, el);
        el.addEventListener('pointerenter', fire);
        el.addEventListener('focusin', fire);
      } else {
        el.addEventListener('click', e => {
          // Let navigation links actually navigate after the event is queued.
          dispatch(name, el);
        });
      }
    });
  }

  /* ----------------------------------------------------------------
   * Hover / focus UI feedback + IntersectionObserver for element_view
   * ---------------------------------------------------------------- */
  function flash(el) {
    el.animate?.([{ boxShadow: '0 0 0 3px var(--accent)' }, { boxShadow: '0 0 0 0 transparent' }], {
      duration: 600,
      easing: 'ease-out',
    });
  }

  function initViewTracking() {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            A.track('element_view', {
              element_id: el.id,
              element_text: el.textContent.trim().slice(0, 60),
            });
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.6 },
    );
    document.querySelectorAll('[data-view]').forEach(el => io.observe(el));
  }

  /* ----------------------------------------------------------------
   * Video tracking (mirrors Enhanced Measurement video events)
   * ---------------------------------------------------------------- */
  function initVideo() {
    const video = document.getElementById('demo-video');
    if (!video) return;

    const title = video.dataset.title || 'Sample video';

    video.addEventListener('play', () => {
      A.track('video_start', {
        video_title: title,
        video_url: video.currentSrc,
        video_provider: 'self-hosted',
      });
    });

    video.addEventListener('timeupdate', () => {
      if (video.duration === 0) return;
      const percent = Math.floor((video.currentTime / video.duration) * 100);
      for (const target of [10, 25, 50, 75]) {
        if (percent >= target && video.dataset[`p${target}`] !== '1') {
          video.dataset[`p${target}`] = '1';
          A.track('video_progress', {
            video_title: title,
            video_current_time: Math.round(video.currentTime),
            video_percent: target,
          });
        }
      }
    });

    video.addEventListener('ended', () => {
      A.track('video_complete', {
        video_title: title,
        video_url: video.currentSrc,
      });
    });
  }

  /* ----------------------------------------------------------------
   * Consent + debug + send controls
   * ---------------------------------------------------------------- */
  function initControls() {
    const consentToggle = document.getElementById('consent-toggle');
    consentToggle.addEventListener('change', () => {
      const value = consentToggle.checked ? 'granted' : 'denied';
      A.setConsent(value);
    });
    consentToggle.checked = A.state.consent === 'granted';

    const debugToggle = document.getElementById('debug-toggle');
    debugToggle.addEventListener('change', () => A.setDebug(debugToggle.checked));
    debugToggle.checked = A.state.debug;

    const status = document.getElementById('send-status');
    status.textContent = A.state.send ? 'LIVE (sending)' : 'SANDBOX (logging only)';
    status.className = `badge ${A.state.send ? 'badge-success' : 'badge-warning'}`;

    const idEl = document.getElementById('measurement-id');
    idEl.textContent = A.state.measurementId;
    const isReal = /^G-[A-Z0-9]{6,}$/i.test(A.state.measurementId);
    idEl.className = `badge ${isReal ? 'badge-accent' : 'badge-info'}`;

    const input = document.getElementById('measurement-input');
    if (input) {
      const saved = localStorage.getItem('ga4-measurement-id');
      if (saved && /^G-[A-Z0-9]{6,}$/i.test(saved)) {
        A.state.measurementId = saved;
        A.state.send = true;
        A.state.live = true;
        idEl.textContent = saved;
        idEl.className = 'badge badge-accent';
        A.loadLoader();
        gtag('js', new Date());
        gtag('config', saved, { debug_mode: A.state.debug });
        A.setConsent('granted');
      }
      input.value = A.state.measurementId;
      input.addEventListener('input', () => {
        const raw = input.value.trim();
        const valid = /^G-[A-Z0-9]{6,}$/i.test(raw);
        idEl.textContent = raw;
        idEl.className = `badge ${valid ? 'badge-accent' : 'badge-info'}`;
        if (!valid) return;
        localStorage.setItem('ga4-measurement-id', raw);
        A.state.measurementId = raw;
        A.state.send = true;
        A.state.live = true;
        A.loadLoader();
        gtag('js', new Date());
        gtag('config', raw, { debug_mode: A.state.debug });
        A.setConsent('granted');
        const status = document.getElementById('send-status');
        status.textContent = 'LIVE (sending)';
        status.className = 'badge badge-success';
      });
    }
  }

  /* ----------------------------------------------------------------
   * Event log renderer
   * ---------------------------------------------------------------- */
  const MAX_LOG = 40;

  function renderLog(entry) {
    const log = document.getElementById('event-log');
    const empty = document.getElementById('log-empty');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = 'log-entry';

    let tag = 'EVENT';
    let tagClass = 'badge-accent';
    if (entry.type === 'init') {
      tag = 'INIT';
      tagClass = 'badge-purple';
    }
    if (entry.type === 'consent') {
      tag = 'CONSENT';
      tagClass = 'badge-warning';
    }
    if (entry.type === 'debug') {
      tag = 'DEBUG';
      tagClass = 'badge-info';
    }
    if (entry.type === 'gtag' && entry.args[0] === 'consent') {
      tag = 'CONSENT';
      tagClass = 'badge-warning';
    }
    if (entry.type === 'gtag' && entry.args[0] === 'config') {
      tag = 'CONFIG';
      tagClass = 'badge-info';
    }

    const time = new Date(entry.ts).toLocaleTimeString();
    const label = entry.name || entry.args?.slice(0, 2).join(' ') || entry.type;

    const paramsHtml =
      entry.type === 'track'
        ? `<div class="log-params">${escapeHtml(JSON.stringify(entry.params, null, 2))}</div>`
        : entry.type === 'gtag' && entry.args
          ? `<div class="log-params">${escapeHtml(JSON.stringify(entry.args, null, 2))}</div>`
          : '';

    div.innerHTML =
      `<div class="log-head">` +
      `<span class="log-time">${time}</span>` +
      `<span class="badge ${tagClass}">${tag}</span>` +
      `<span class="log-name">${escapeHtml(String(label))}</span>` +
      `</div>${paramsHtml}`;

    log.prepend(div);

    while (log.children.length > MAX_LOG) {
      log.lastChild.remove();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function valueOf(el, name) {
    const input = el.querySelector(`[name="${name}"]`);
    return input ? input.value.trim() || `(empty ${name})` : `(no ${name} field)`;
  }

  /* ----------------------------------------------------------------
   * Boot
   * ---------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    A.on(renderLog);
    A.init();

    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

    renderURL();
    renderSampleUrls();
    bindEvents();
    initViewTracking();
    initVideo();
    initControls();

    // Header echo of current URL (read-only, so the sandbox reflects state).
    document.getElementById('full-url').textContent = window.location.href;

    console.info(
      `[GA4 Sandbox] ${A.state.send ? 'LIVE' : 'SANDBOX'} mode — ` + `measurementId=${A.state.measurementId}`,
    );
  });
})();
