/* SMFGU public-only GA4 integration v1.0 — basic, opt-in consent mode.
 * Never include this file on account, learning, checkout, or private pages.
 * No Google request is initiated before affirmative analytics permission.
 */
(() => {
  'use strict';
  const MEASUREMENT_ID = 'G-6BDZQGVPD2';
  const STORAGE_KEY = 'smfgu_public_analytics_consent_v1';
  let tagStarted = false;
  let choice = null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'granted' || stored === 'denied') choice = stored;
  } catch { /* Browsers can disable preference storage. */ }

  function safeReferrer() {
    try {
      const url = new URL(document.referrer);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : '';
    } catch { return ''; }
  }

  function activateTag() {
    if (tagStarted) return;
    tagStarted = true;
    // Consent is denied by default, before any Google tag is requested.
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('set', 'allow_google_signals', false);
    window.gtag('set', 'allow_ad_personalization_signals', false);
    window.gtag('js', new Date());
    // Do not send query strings, fragments, account IDs or third-party referral paths.
    window.gtag('config', MEASUREMENT_ID, {
      page_location: location.origin + location.pathname,
      page_referrer: safeReferrer()
    });
    // Account creation is verified at /api/account before a one-time marker
    // is written. Report it only on a PUBLIC page after prior consent.
    // Never include the account email, name, account ID, or URL query string.
    try {
      const pending = sessionStorage.getItem('smfgu_pending_signup_v1');
      if (pending !== null) {
        sessionStorage.removeItem('smfgu_pending_signup_v1');
        const age = Date.now() - Number(pending);
        if (Number.isFinite(age) && age >= 0 && age <= 15 * 60 * 1000) {
          window.gtag('event', 'sign_up', { method: 'email' });
        }
      }
    } catch { /* Consent is not permission to bypass browser storage restrictions. */ }
    const loader = document.createElement('script');
    loader.async = true;
    loader.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    loader.dataset.smfguAnalytics = 'v1';
    document.head.append(loader);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // Public funnel interest only. These are NOT sign_up or purchase conversions.
  // Never use user-supplied form fields, URL parameters, product order IDs,
  // email addresses, account identifiers, or transaction amounts as GA inputs.
  const allowedDestinations = Object.freeze({
    '/create-account.html': ['smfgu_registration_start', 'account'],
    '/books.html': ['smfgu_catalog_interest', 'books'],
    '/store.html': ['smfgu_catalog_interest', 'store'],
    '/membership.html': ['smfgu_catalog_interest', 'membership'],
    '/tools.html': ['smfgu_catalog_interest', 'tools'],
    '/learn.html': ['smfgu_learning_interest', 'learn'],
    '/lab-samples.html': ['smfgu_learning_interest', 'samples']
  });
  function trackPublicNavigation(event) {
    if (choice !== 'granted' || !tagStarted || typeof window.gtag !== 'function') return;
    const target = event.target;
    const anchor = target && typeof target.closest === 'function' ? target.closest('a[href]') : null;
    if (!anchor || !anchor.href) return;
    let destination;
    try { destination = new URL(anchor.href, location.origin); } catch { return; }
    if (destination.origin !== location.origin) return;
    const pathname = destination.pathname.endsWith('/') ? destination.pathname.slice(0, -1) : destination.pathname;
    const normalized = pathname.endsWith('.html') ? pathname : pathname + '.html';
    const match = allowedDestinations[normalized];
    if (!match) return;
    // The only event parameters are fixed source-controlled strings.
    window.gtag('event', match[0], { content_type: 'public_navigation', item_id: match[1] });
  }

  function init() {
    if (!document.body || document.getElementById('smfgu-analytics-choice')) return;
    const style = el('style');
    style.textContent = [
      '.smfgu-analytics-control{font:inherit;font-size:.83rem;color:inherit;background:transparent;border:1px solid currentColor;border-radius:5px;padding:6px 10px;margin:10px 0;cursor:pointer}',
      '.smfgu-analytics-panel{position:fixed;bottom:14px;left:14px;right:14px;z-index:2147482000;max-width:620px;margin:0 auto;color:#f0f5f8;background:#13212f;border:1px solid #607991;border-radius:12px;box-shadow:0 10px 36px #0009;padding:18px;font:inherit;line-height:1.5}',
      '.smfgu-analytics-panel[hidden]{display:none!important}',
      '.smfgu-analytics-panel h2{font-size:1.08rem;margin:0 0 8px;color:inherit}',
      '.smfgu-analytics-panel p{font-size:.9rem;margin:0 0 12px;color:#d7e2eb}',
      '.smfgu-analytics-panel a{color:#a7d8ff}',
      '.smfgu-analytics-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}',
      '.smfgu-analytics-actions button{font:inherit;min-height:40px;padding:8px 15px;border-radius:7px;border:1px solid #87a4bc;cursor:pointer;background:#253a4a;color:white}',
      '.smfgu-analytics-actions button:first-child{background:#277a67;border-color:#54b49d}',
      '.smfgu-analytics-panel button:focus-visible,.smfgu-analytics-control:focus-visible{outline:3px solid #b0ddff;outline-offset:3px}'
    ].join('');
    document.head.append(style);
    const panel = el('section', 'smfgu-analytics-panel');
    panel.id = 'smfgu-analytics-choice';
    panel.setAttribute('aria-label', 'Optional analytics preferences');
    panel.hidden = true;
    panel.append(el('h2', '', 'Optional website analytics'));
    panel.append(el('p', '', 'With your permission, Google Analytics measures visits to our public pages. It is not required for access to our books, lessons, tools, or memberships.'));
    const links = el('p');
    const privacy = el('a', '', 'Privacy');
    privacy.href = '/privacy.html';
    const cookies = el('a', '', 'Cookie Policy');
    cookies.href = '/cookie-policy.html';
    links.append(privacy, document.createTextNode('  ·  '), cookies);
    panel.append(links);
    const actions = el('div', 'smfgu-analytics-actions');
    const accept = el('button', '', 'Allow analytics');
    const decline = el('button', '', 'Decline analytics');
    accept.type = decline.type = 'button';
    actions.append(accept, decline);
    panel.append(actions);
    document.body.append(panel);
    const settings = el('button', 'smfgu-analytics-control', 'Analytics preferences');
    settings.type = 'button';
    settings.setAttribute('aria-controls', panel.id);
    const footer = document.querySelector('footer');
    (footer || document.body).append(settings);

    function show() {
      panel.hidden = false;
      settings.setAttribute('aria-expanded', 'true');
    }
    function hide() {
      panel.hidden = true;
      settings.setAttribute('aria-expanded', 'false');
    }
    function choose(next) {
      choice = next;
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      hide();
      if (next === 'granted') activateTag();
      else if (tagStarted) {
        window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
        // Reload without the tag after a visitor revokes consent.
        location.reload();
      }
    }
    accept.addEventListener('click', () => choose('granted'));
    decline.addEventListener('click', () => choose('denied'));
    settings.addEventListener('click', () => panel.hidden ? show() : hide());
    document.addEventListener('click', trackPublicNavigation, { capture: true });
    if (choice === 'granted') activateTag();
    else if (choice === null) show();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
