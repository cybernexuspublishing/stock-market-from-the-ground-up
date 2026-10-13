/* v0.13.4.2: one authoritative page-route classification shared by Pages middleware and the service worker.
   This file MUST remain classic-script compatible for importScripts(), and must not include secrets. */
(function(root){
  'use strict';
  const MEMBER = [
    'dashboard','account','access','settings','data-connections',
    'my-library','my-purchases','checkout','market-commons',
    'labs','site-lab','simulator','journal','journal-entry','journal-analytics',
    'skills','review-queue','advanced-tool','forum-topic','challenges',
    'environments','compare','assessments','ondemand-training','my-books','activate-book','mfa-security'
  ];
  const STAFF = ['admin','admin-operations','admin-lab-preview','plan-controls','gws-projects','training-editor'];
  const PUBLIC_PREVIEWS = ['lab-player','market-tutor','tools','learn','lab-samples','store','membership'];
  const MEMBER_SET = new Set(MEMBER);
  const STAFF_SET = new Set(STAFF);
  const PREVIEW_SET = new Set(PUBLIC_PREVIEWS);
  function canonicalPath(raw){
    const path = (String(raw || '/').split(/[?#]/,1)[0] || '/').replace(/\/+$/,'') || '/';
    return path.startsWith('/') ? path.toLowerCase() : '/' + path.toLowerCase();
  }
  function routeName(raw){
    const path = canonicalPath(raw);
    if (path === '/') return '';
    if (!/^\/[a-z0-9-]+(?:\.html)?$/.test(path)) return null;
    return path.slice(1).replace(/\.html$/,'');
  }
  function classify(raw){
    const name = routeName(raw);
    if (name && STAFF_SET.has(name)) return 'staff';
    if (name && MEMBER_SET.has(name)) return 'member';
    if (name && PREVIEW_SET.has(name)) return 'public-preview';
    return 'public';
  }
  function isProtected(raw){return ['member','staff'].includes(classify(raw));}
  root.GroundUpRoutePolicy = Object.freeze({
    version:'0.14.0.4',
    member:Object.freeze(MEMBER),
    staff:Object.freeze(STAFF),
    publicPreviews:Object.freeze(PUBLIC_PREVIEWS),
    canonicalPath,routeName,classify,isProtected
  });
})(globalThis);
