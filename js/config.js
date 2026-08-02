/**
 * GA4 Tagging Sandbox — Central Configuration & Constants
 * ------------------------------------------------------
 * Single source of truth. No hardcoded values in the rest of the code.
 * To go live: (1) replace MEASUREMENT_ID, (2) set DEFAULT_ENABLE_SEND to true,
 * or override at runtime via query params: ?send=1 ?send=0 ?debug=1 ?debug=0
 */
(() => {
  const query = new URLSearchParams(window.location.search);

  const CONFIG = Object.freeze({
    /** Your GA4 Measurement ID, e.g. "G-ABC123XYZ". Override at runtime via ?measurementId=G-XXXXX */
    MEASUREMENT_ID: query.get('measurementId') || 'G-REPLACE_ME',

    /** Default send behavior. Query override: ?send=1 / ?send=0 */
    DEFAULT_ENABLE_SEND: false,

    /** Send debug_mode=true with config so DebugView picks up events. Override: ?debug=1 / ?debug=0 */
    DEFAULT_DEBUG_MODE: true,

    /** Add these GA4-automatic parameters to every custom event. */
    ENRICH_DEFAULTS: true,

    /** Initial consent state for analytics_storage / ad_storage. */
    DEFAULT_CONSENT: 'granted',
  });

  const ENABLE_SEND = query.get('send') === '1' ? true : query.get('send') === '0' ? false : CONFIG.DEFAULT_ENABLE_SEND;

  const DEBUG_MODE = query.get('debug') === '1' ? true : query.get('debug') === '0' ? false : CONFIG.DEFAULT_DEBUG_MODE;

  /** Sample product catalog used by ecommerce events. Shared + DRY. */
  const ITEMS = Object.freeze([
    {
      item_id: 'SKU-001',
      item_name: 'Wireless Keyboard',
      item_category: 'Electronics',
      price: 49.99,
      quantity: 1,
    },
    {
      item_id: 'SKU-002',
      item_name: 'USB-C Cable',
      item_category: 'Accessories',
      price: 9.99,
      quantity: 2,
    },
  ]);

  /** UTM + auto-tagging params detected in the URL and attached to campaign events. */
  const CAMPAIGN_PARAMS = Object.freeze([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'dclid',
    'fbclid',
  ]);

  /**
   * Event registry — documentation of every event this sandbox can fire.
   * name -> { description, params[] }
   */
  const EVENTS = Object.freeze({
    /* --- Automatic / Enhanced Measurement --- */
    page_view: {
      description: 'Sent automatically by gtag config (send_page_view).',
      params: ['page_location', 'page_path'],
    },
    scroll: {
      description: 'Enhanced Measurement: fired automatically when >90% of page is scrolled.',
      params: ['percent_scrolled', 'page_path'],
    },
    click: {
      description: 'Enhanced Measurement: automatic outbound link click.',
      params: ['link_url', 'link_text'],
    },
    file_download: {
      description: 'Enhanced Measurement: automatic file download. Demoed manually here.',
      params: ['file_name', 'file_extension', 'link_url'],
    },
    form_start: {
      description: 'Enhanced Measurement: user begins interacting with a form.',
      params: ['form_id', 'form_name'],
    },
    form_submit: {
      description: 'Enhanced Measurement: user submits a form.',
      params: ['form_id', 'form_name'],
    },
    video_start: {
      description: 'Enhanced Measurement: video starts playing.',
      params: ['video_title', 'video_url', 'video_provider'],
    },
    video_progress: {
      description: 'Enhanced Measurement: video reaches 10%, 25%, 50% or 75%.',
      params: ['video_title', 'video_current_time', 'video_percent'],
    },
    video_complete: {
      description: 'Enhanced Measurement: video reaches 100%.',
      params: ['video_title', 'video_url'],
    },

    /* --- Standard custom events --- */
    search: {
      description: 'Search performed. Requires the `search_term` param.',
      params: ['search_term'],
    },
    sign_up: {
      description: 'User completed sign up. Param: method (e.g. google/email).',
      params: ['method'],
    },
    login: {
      description: 'User logged in. Param: method.',
      params: ['method'],
    },
    generate_lead: {
      description: 'Lead generation. Params: value, currency.',
      params: ['value', 'currency'],
    },
    select_content: {
      description: 'User selected content. Params: content_type, item_id.',
      params: ['content_type', 'item_id'],
    },
    share: {
      description: 'Content shared. Params: method, content_type, item_id.',
      params: ['method', 'content_type', 'item_id'],
    },
    view_promotion: {
      description: 'Promotion was shown. Params: promotion_id, promotion_name, creative_name.',
      params: ['promotion_id', 'promotion_name', 'creative_name'],
    },
    select_promotion: {
      description: 'User clicked a promotion.',
      params: ['promotion_id', 'promotion_name', 'creative_name'],
    },

    /* --- Ecommerce --- */
    view_item: {
      description: 'Product detail view. Params: currency, value, items[].',
      params: ['currency', 'value', 'items'],
    },
    add_to_cart: {
      description: 'Item added to cart. Params: currency, value, items[].',
      params: ['currency', 'value', 'items'],
    },
    begin_checkout: {
      description: 'Checkout started. Params: currency, value, items[].',
      params: ['currency', 'value', 'items'],
    },
    add_payment_info: {
      description: 'Payment info added. Params: currency, value, items[].',
      params: ['currency', 'value', 'items'],
    },
    purchase: {
      description: 'Purchase completed. Params: transaction_id, value, tax, shipping, currency, items[].',
      params: ['transaction_id', 'value', 'tax', 'shipping', 'currency', 'items'],
    },
    refund: {
      description: 'Purchase refunded. Params: transaction_id, value, currency.',
      params: ['transaction_id', 'value', 'currency'],
    },

    /* --- Custom / experimental --- */
    element_hover: {
      description: 'Custom event: pointer hovers / keyboard focuses an element.',
      params: ['element_id', 'element_text', 'page_path'],
    },
    element_view: {
      description: 'Custom event: element scrolled into view (IntersectionObserver).',
      params: ['element_id', 'element_text'],
    },
    utm_triggered: {
      description: 'Custom event fired because a campaign param was present in the URL.',
      params: CAMPAIGN_PARAMS,
    },
    query_param_test: {
      description: 'Custom event echoing a single query param key/value pair.',
      params: ['param_key', 'param_value'],
    },
    test_event: {
      description: 'Generic ping with a random id for end-to-end verification.',
      params: ['test_id', 'random'],
    },
  });

  const SAMPLE_URLS = Object.freeze([
    {
      label: 'Default',
      url: 'index.html',
    },
    {
      label: 'UTM campaign',
      url: 'index.html?utm_source=newsletter&utm_medium=email&utm_campaign=summer_sale&utm_content=hero_banner',
    },
    {
      label: 'Paid / gclid',
      url: 'index.html?utm_source=google&utm_medium=cpc&utm_campaign=brand&gclid=CjwKCAiA&gclsrc=aw.ds',
    },
    {
      label: 'Query echo test',
      url: 'index.html?product=keyboard&color=black',
    },
    {
      label: 'Send enabled',
      url: 'index.html?send=1',
    },
    {
      label: 'Debug view',
      url: 'index.html?debug=1',
    },
  ]);

  window.GA4 = {
    CONFIG,
    ENABLE_SEND,
    DEBUG_MODE,
    ITEMS,
    CAMPAIGN_PARAMS,
    EVENTS,
    SAMPLE_URLS,
  };
})();
