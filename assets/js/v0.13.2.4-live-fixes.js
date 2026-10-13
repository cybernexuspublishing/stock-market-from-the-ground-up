(() => {
  'use strict';
  const BUILD = 'v0.13.2.4';
  const normalize = (v) => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function removeLifetimeCoveragePromo(root = document) {
    const headings = root.querySelectorAll ? root.querySelectorAll('h1,h2,h3,h4') : [];
    headings.forEach((heading) => {
      const text = normalize(heading.textContent);
      if (!text.includes('lifetime platform access follows the entire first-party trading library')) return;
      const block = heading.closest('section,article,.card,.v11-card,.v13-card,.dashboard-space,[class*="card"]') || heading.parentElement;
      if (block) block.remove();
    });
    const labels = root.querySelectorAll ? root.querySelectorAll('.eyebrow,[class*="eyebrow"]') : [];
    labels.forEach((label) => {
      if (normalize(label.textContent) !== 'lifetime coverage') return;
      const block = label.closest('section,article,.card,.v11-card,.v13-card,.dashboard-space,[class*="card"]') || label.parentElement;
      if (block) block.remove();
    });
  }



  function removeDeletionRetentionCopy(root = document) {
    const nodes = root.querySelectorAll ? root.querySelectorAll('p,small,div') : [];
    nodes.forEach((el) => {
      const text = normalize(el.textContent);
      if (!text) return;
      if (text.includes('legally or operationally required records may be retained') ||
          text.includes('transaction, tax, fraud-prevention, dispute, security, or audit records may be retained') ||
          text.includes('retained transaction or security records are handled under the privacy policy')) {
        el.remove();
      }
    });
  }

  function run() {
    document.body?.setAttribute('data-live-fix-build', BUILD);
    removeLifetimeCoveragePromo();
    removeDeletionRetentionCopy();
    // Some legacy modules render membership content after DOMContentLoaded.
    // Observe briefly so the removed promotional block cannot reappear late.
    let timer;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { removeLifetimeCoveragePromo(); removeDeletionRetentionCopy(); }, 30);
    });
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
