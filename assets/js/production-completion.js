(() => {
    'use strict';
    const BUILD = 'v0.13.2';
    const path = (location.pathname || '/').toLowerCase();
    const q = (s, r = document) => r.querySelector(s);
    const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    async function sb() { for (let i = 0; i < 40; i++) {
        const f = window.getSupabaseClient;
        if (typeof f === 'function')
            try {
                return await f();
            }
            catch { }
        ;
        await sleep(75);
    } return null; }
    async function session() { const s = await sb(); try {
        return (await s.auth.getSession()).data.session;
    }
    catch {
        return null;
    } }
    async function api(url, options = {}) { const s = await session(); const r = await fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(s ? { authorization: `Bearer ${s.access_token}` } : {}), ...(options.headers || {}) }, cache: 'no-store' }); const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false)
        throw new Error(j.error || `HTTP ${r.status}`); return j; }
    async function adminApi(action, body, method = 'POST') { return api(`/api/admin-v013?action=${encodeURIComponent(action)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }); }
    const toast = (m, t = 'info') => (window.SiteUI?.toast?.(m, t) || alert(m));
    function normalizeHeaderSearch() { const b = q('.fe-command-button'); if (b) {
        b.classList.add('v132-search-wide');
        const span = q('span', b);
        if (span)
            span.textContent = 'Search site';
    } }
    async function notificationCenter() { const old = q('.fe-notify-button'); if (!old || old.dataset.v132)
        return; old.dataset.v132 = '1'; old.addEventListener('click', async (e) => { e.preventDefault(); e.stopImmediatePropagation(); let d = q('#v132-notifications'); if (!d) {
        d = document.createElement('dialog');
        d.id = 'v132-notifications';
        d.className = 'fe-dialog fe-drawer';
        d.innerHTML = '<div class="fe-dialog-head"><h2>Notifications</h2><button class="fe-dialog-close">×</button></div><div class="fe-dialog-body"><div class="v132-notice-actions"><button class="btn secondary" data-read-all>Mark all as read</button></div><div data-list></div></div>';
        document.body.appendChild(d);
        q('.fe-dialog-close', d).addEventListener('click', () => d.close());
    } const render = async () => { const j = await api('/api/ui-state?action=notifications'), rows = j.notifications || [], host = q('[data-list]', d); host.innerHTML = rows.length ? rows.map((n) => `<article class="fe-notification ${n.is_read ? '' : 'unread'}" data-id="${n.id}"><div><h4>${esc(n.title)}</h4><p>${esc(n.body || '')}</p><time>${new Date(n.created_at).toLocaleString()}</time></div>${n.href ? `<a href="${esc(n.href)}" data-open>Open</a>` : ''}</article>`).join('') : '<div class="fe-state"><h3>You’re caught up.</h3><p>No notifications right now.</p></div>'; qa('[data-id]', host).forEach(row => row.addEventListener('click', async () => { if (!row.classList.contains('unread'))
        return; await api('/api/ui-state?action=notifications_read', { method: 'POST', body: JSON.stringify({ ids: [Number(row.dataset.id)] }) }); row.classList.remove('unread'); await updateBadge(); })); const all = q('[data-read-all]', d); if (all)
        all.onclick = async () => { const ids = rows.filter((x) => !x.is_read).map((x) => x.id); if (ids.length)
            await api('/api/ui-state?action=notifications_read', { method: 'POST', body: JSON.stringify({ ids }) }); await render(); await updateBadge(); }; }; const updateBadge = async () => { const j = await api('/api/ui-state?action=notifications'), n = (j.notifications || []).filter((x) => !x.is_read).length, c = q('.fe-notify-count', old); if (c) {
        c.textContent = n ? String(n) : '';
        c.hidden = n === 0;
    } }; d.showModal(); await render(); await updateBadge(); }, { capture: true }); }
    function createAccountUpgrade() {
        if (!/\/(create-account)(\.html)?$/.test(path))
            return;
        const form = q('main form,form');
        if (!form || form.dataset.v132)
            return;
        form.dataset.v132 = '1';
        const fields = q('input[name="username"],#username', form) || q('input[type="email"]', form);
        const wrap = document.createElement('div');
        wrap.className = 'v132-registration-identity';
        wrap.innerHTML = '<div class="v132-grid two"><label>First Name<input name="v132_first_name" autocomplete="given-name" maxlength="80" required></label><label>Last Name<input name="v132_last_name" autocomplete="family-name" maxlength="80" required></label></div><label>Date of Birth <span class="muted">DD/MM/YYYY</span><input name="v132_dob" inputmode="numeric" placeholder="DD/MM/YYYY" maxlength="10" autocomplete="bday" required></label><p class="v132-field-note">You must be at least 18 years old to create an account or make a purchase.</p>';
        (fields?.closest('label,.field,.form-group') || form.firstElementChild)?.insertAdjacentElement('beforebegin', wrap);
        form.addEventListener('submit', async (e) => { e.preventDefault(); e.stopImmediatePropagation(); const fd = new FormData(form), pick = (names) => { for (const n of names) {
            const v = fd.get(n);
            if (v)
                return String(v);
        } return ''; }; const body = { firstName: pick(['v132_first_name']), lastName: pick(['v132_last_name']), dateOfBirth: pick(['v132_dob']), username: pick(['username', 'user_name']), email: pick(['email']), password: pick(['password']), confirmPassword: pick(['confirm_password', 'password_confirm', 'confirmPassword']) || pick(['password']) }; const btn = q('button[type="submit"]', form); try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Creating account…';
            }
            const r = await api('/api/account?action=signup', { method: 'POST', body: JSON.stringify(body) });
            form.innerHTML = `<div class="v132-success"><div class="eyebrow">Account created</div><h2>Check your email to verify your account.</h2><p>After verification, sign in with your Username or Email Address.</p><a class="btn" href="signin.html">Go to Sign In</a></div>`;
        }
        catch (err) {
            toast(err.message, 'bad');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        } }, { capture: true });
    }
    function credentialVisibility(form) { qa('input[type="password"]', form).forEach(input => { if (input.nextElementSibling?.classList.contains('v132-secret-toggle'))
        return; const b = document.createElement('button'); b.type = 'button'; b.className = 'v132-secret-toggle'; b.textContent = 'Show'; b.setAttribute('aria-pressed', 'false'); b.onclick = () => { const show = input.type === 'password'; input.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-pressed', String(show)); }; input.insertAdjacentElement('afterend', b); }); }
    function profileMenuCleanup() { qa('header a, .v13-profile-menu a, footer a').forEach(a => { const t = (a.textContent || '').trim(); if (/^Profile$/i.test(t))
        a.href = 'dashboard.html'; if (/account\.html/.test(a.getAttribute('href') || ''))
        a.href = 'dashboard.html'; }); }
    async function renderConnections(host) { host.innerHTML = '<div class="fe-state">Loading secure connections…</div>'; try {
        const j = await api('/api/credentials?action=list'), map = new Map((j.connections || []).map((x) => [x.service_code, x]));
        const services = [{ code: 'TIINGO_BYO', name: 'Tiingo', fields: [['token', 'API Token', 'password']], help: 'help.html#tokens-tiingo' }, { code: 'ALPACA_BYO', name: 'Alpaca', fields: [['apiKey', 'API Key', 'password'], ['apiSecret', 'API Secret', 'password']], help: 'help.html#tokens-alpaca' }];
        host.innerHTML = services.map(s => { const c = map.get(s.code); return `<article class="v132-connection-card" data-service="${s.code}"><div><div class="eyebrow">Market Data Connection</div><h4>${s.name}</h4><p>${c ? `Saved credential ${esc(c.masked_hint || '••••')} · ${esc(c.status || 'saved')}` : 'Not connected'}</p>${c?.last_tested_at ? `<small>Last tested ${new Date(c.last_tested_at).toLocaleString()}</small>` : ''}</div><div class="actions"><button class="btn secondary" data-add>${c ? 'Replace' : 'Add Credential'}</button>${c ? '<button class="btn secondary" data-remove>Remove</button>' : ''}<a class="btn secondary" href="${s.help}">How to get it</a></div></article>`; }).join('');
        qa('[data-service]', host).forEach(card => { const service = services.find(s => s.code === card.dataset.service); q('[data-add]', card).onclick = () => { let f = q('.v132-credential-form', card); if (f) {
            f.remove();
            return;
        } f = document.createElement('form'); f.className = 'v132-credential-form'; f.innerHTML = service.fields.map(([k, l, t]) => `<label>${l}<span class="v132-secret-field"><input type="${t}" name="${k}" autocomplete="off" required></span></label>`).join('') + '<div class="actions"><button class="btn">Test & Save Securely</button><button type="button" class="btn secondary" data-cancel>Cancel</button></div><p class="v132-field-note">Show/Hide works while entering. After Save, the complete secret is not returned to the browser; only a masked hint is displayed.</p>'; card.appendChild(f); credentialVisibility(f); q('[data-cancel]', f).onclick = () => f.remove(); f.onsubmit = async (e) => { e.preventDefault(); const values = Object.fromEntries(new FormData(f).entries()); try {
            await api('/api/credentials?action=save', { method: 'POST', body: JSON.stringify({ serviceCode: service.code, values }) });
            toast('Connection saved securely.', 'ok');
            await renderConnections(host);
        }
        catch (err) {
            toast(err.message, 'bad');
        } }; }; const rm = q('[data-remove]', card); if (rm)
            rm.onclick = async () => { if (!confirm('Remove this saved connection?'))
                return; await api('/api/credentials?action=delete', { method: 'POST', body: JSON.stringify({ serviceCode: service.code }) }); await renderConnections(host); }; });
    }
    catch (err) {
        host.innerHTML = `<div class="fe-state error">${esc(err.message)}</div>`;
    } }
    async function memberSettings(host) { if (host.dataset.v132)
        return; host.dataset.v132 = '1'; host.innerHTML = '<div class="v132-subtabs" role="tablist"><button data-s="account">Account</button><button data-s="security">Security</button><button data-s="connections">Connections & API Keys</button><button data-s="book">Book Access</button><button data-s="notifications">Notifications</button><button data-s="accessibility">Accessibility</button><button data-s="privacy">Privacy</button><button data-s="danger">Danger Zone</button></div><div data-settings-body></div>'; const body = q('[data-settings-body]', host); const activate = async (code) => { qa('[data-s]', host).forEach(b => b.classList.toggle('active', b.dataset.s === code)); if (code === 'account') {
        let identity = {};
        try {
            identity = await api('/api/account?action=identity');
        }
        catch { }
        const missing = !identity.profile?.dateOfBirthPresent;
        body.innerHTML = `<article class="v13-card"><h3>Account</h3><div class="v132-grid two"><label>Username<input value="${esc(identity.profile?.username || '')}" readonly></label><label>Email<input value="${esc(identity.profile?.email || '')}" readonly></label>${missing ? `<label>First Name<input data-identity-first value="${esc(identity.profile?.firstName || '')}" required></label><label>Last Name<input data-identity-last value="${esc(identity.profile?.lastName || '')}" required></label><label>Date of Birth (DD/MM/YYYY)<input data-identity-dob inputmode="numeric" placeholder="DD/MM/YYYY" required></label><div class="v132-field-action"><button class="btn" data-identity-save>Complete Account Identity</button></div>` : `<label>First Name<input value="${esc(identity.profile?.firstName || '')}" readonly></label><label>Last Name<input value="${esc(identity.profile?.lastName || '')}" readonly></label>`}</div><p class="v132-field-note">${missing ? 'Complete the required 18+ account eligibility information. Date of birth is stored as restricted private account data and is not shown publicly.' : 'Username and verified account identity are controlled account records. Contact Support if a legal account correction is required.'}</p></article>`;
        const save = q('[data-identity-save]', body);
        if (save)
            save.onclick = async () => { save.disabled = true; try {
                await api('/api/account?action=identity_complete', { method: 'POST', body: JSON.stringify({ firstName: q('[data-identity-first]', body).value, lastName: q('[data-identity-last]', body).value, dateOfBirth: q('[data-identity-dob]', body).value }) });
                toast('Account identity completed.', 'ok');
                await activate('account');
            }
            catch (err) {
                toast(err.message, 'bad');
            }
            finally {
                save.disabled = false;
            } };
    }
    else if (code === 'connections') {
        body.innerHTML = '<div id="v132-connections"></div>';
        await renderConnections(q('#v132-connections', body));
    }
    else if (code === 'security') {
        body.innerHTML = '<article class="v13-card"><h3>Security</h3><p>Use a unique password, protect connected API credentials, and sign out from shared devices.</p><a class="btn secondary" href="signin.html?reset=1">Password / Sign-in Help</a></article>';
    }
    else if (code === 'book') {
        body.innerHTML = '<article class="v13-card"><h3>Book Access & Book Keys</h3><iframe class="v13-settings-frame" src="settings.html?embedded=1" title="Book access settings"></iframe></article>';
    }
    else if (code === 'notifications') {
        body.innerHTML = '<article class="v13-card"><h3>Notifications</h3><p>Control in-app and email preferences as services are enabled.</p><div class="v132-setting-list"><label><span>Community replies</span><input type="checkbox" checked></label><label><span>Learning releases</span><input type="checkbox" checked></label><label><span>Billing/account notices</span><input type="checkbox" checked disabled></label></div></article>';
    }
    else if (code === 'accessibility') {
        body.innerHTML = '<article class="v13-card"><h3>Accessibility</h3><p>Display preferences are available from the Accessibility panel and are saved to your account where supported.</p><a class="btn secondary" href="accessibility.html">Accessibility information</a></article>';
    }
    else if (code === 'privacy') {
        let cp = { preferences: {} };
        try {
            cp = await api('/api/account?action=consent');
        }
        catch { }
        const x = cp.preferences || {};
        body.innerHTML = `<article class="v13-card"><h3>Privacy & Data</h3><p>Control optional analytics, advertising personalization, marketing email, and community email preferences. Essential authentication, security, billing, and transactional processing cannot be disabled where required to operate the service.</p><div class="v132-setting-list"><label><span>Optional analytics</span><input type="checkbox" data-consent="analytics" ${x.analytics ? 'checked' : ''}></label><label><span>Advertising personalization</span><input type="checkbox" data-consent="advertisingPersonalization" ${x.advertising_personalization ? 'checked' : ''}></label><label><span>Marketing email</span><input type="checkbox" data-consent="marketingEmail" ${x.marketing_email ? 'checked' : ''}></label><label><span>Community email</span><input type="checkbox" data-consent="communityEmail" ${x.community_email !== false ? 'checked' : ''}></label></div><div class="actions"><button class="btn" data-save-consent>Save Privacy Preferences</button><a class="btn secondary" href="privacy.html">Privacy Policy</a><button class="btn secondary" data-export>Export My Activity</button></div></article>`;
        q('[data-save-consent]', body).onclick = async () => { const v = {}; qa('[data-consent]', body).forEach(c => v[c.dataset.consent] = c.checked); await api('/api/account?action=consent', { method: 'POST', body: JSON.stringify(v) }); toast('Privacy preferences saved.', 'ok'); };
        q('[data-export]', body).onclick = () => location.href = 'dashboard.html?tab=activity';
    }
    else if (code === 'danger') {
        body.innerHTML = '<article class="v13-card v132-danger"><h3>Delete Account</h3><p>Deleting your account ends normal account access. Some transaction, tax, fraud-prevention, dispute, security, or audit records may be retained where required.</p><button class="btn danger" data-delete>Delete Account</button></article>';
        q('[data-delete]', body).onclick = memberDeleteFlow;
    } }; qa('[data-s]', host).forEach(b => b.onclick = () => activate(b.dataset.s)); await activate(new URLSearchParams(location.search).get('section') || 'account'); }
    async function memberDeleteFlow() { let pre = {}; try {
        pre = await api('/api/account?action=delete_preflight');
    }
    catch { } ; const phrase = prompt(`This is irreversible. ${pre.activeSubscriptions ? `You have ${pre.activeSubscriptions} active subscription record(s). ` : ''}Type DELETE ACCOUNT exactly to continue.`); if (phrase !== 'DELETE ACCOUNT') {
        toast('Account deletion cancelled.', 'warn');
        return;
    } const reason = prompt('Optional reason for deleting your account:') || ''; try {
        await api('/api/account?action=delete', { method: 'POST', body: JSON.stringify({ confirmation: phrase, reason }) });
        toast('Account deleted.', 'ok');
        setTimeout(() => location.href = 'index.html', 900);
    }
    catch (err) {
        toast(err.message, 'bad');
    } }
    function featureGroup(tool) { const c = String(tool.category || '').toLowerCase(), n = String(tool.name || '').toLowerCase(); if (/research|discovery|scanner|watchlist|catalyst|filing|float|context|supply/.test(`${c} ${n}`))
        return 'Research'; if (/journal|simulator|risk|execution|liquidity|tape|order flow|review|strategy|options|trade/.test(`${c} ${n}`))
        return 'Trade Labs'; return 'Learning'; }
    async function rebuildAccessPanel(host) { const access = await window.PlatformAccess?.get?.(); if (!access)
        return; const tools = access.tools || [], groups = ['Learning', 'Trade Labs', 'Research']; host.innerHTML = `<section class="v13-membership-hero"><div><div class="eyebrow">Current Membership</div><h2>${esc(access.planName || 'Free Membership')}</h2><div class="v13-countdown">${access.renewsAt ? `Renews ${new Date(access.renewsAt).toLocaleString()}` : access.expiresAt ? `Expires ${new Date(access.expiresAt).toLocaleString()}` : access.planCode === 'LIFETIME' || (access.staffRoles || []).includes('OWNER') ? 'Never expires' : 'No scheduled expiration'}</div></div><div><strong>${tools.filter((x) => x.included).length}</strong> tools included<br><strong>${(access.books || []).filter((x) => x.included).length}</strong> books included</div></section><div class="v132-feature-groups">${groups.map(g => { const xs = tools.filter((x) => featureGroup(x) === g); return `<section class="v13-card" data-feature-group="${g}"><div class="v13-section-head"><div><h2>${g}</h2><p>${xs.filter((x) => x.included).length} of ${xs.length} included</p></div><button class="btn secondary" data-show>Show all</button></div><div class="v13-access-matrix">${xs.map((x, i) => `<div class="v13-access-item ${x.included ? 'yes' : 'no'}" data-i="${i}"><span class="mark">${x.included ? '✓' : '✕'}</span><div>${x.included ? `<a href="${esc(x.href || 'tools.html')}">${esc(x.name)}</a>` : `<strong>${esc(x.name)}</strong>`}<small>${x.included ? 'Included' : 'Not included'}</small></div></div>`).join('')}</div></section>`; }).join('')}</div>`; qa('[data-feature-group]', host).forEach(sec => { let all = false; const btn = q('[data-show]', sec); const refresh = () => { qa('.v13-access-item', sec).forEach((x, i) => x.hidden = !all && i >= 5); btn.textContent = all ? 'Show top 5' : 'Show all'; }; btn.onclick = () => { all = !all; refresh(); }; refresh(); }); }
    async function supportPanel(host) { host.innerHTML = '<div class="v13-section-head"><div><div class="eyebrow">Support</div><h2>Support Center</h2><p>Create and track requests without leaving your account.</p></div><button class="btn" data-new-ticket>New Support Request</button></div><div data-ticket-list></div>'; const list = q('[data-ticket-list]', host); const load = async () => { const j = await api('/api/support?action=list'); list.innerHTML = (j.tickets || []).length ? (j.tickets || []).map((t) => `<article class="v132-ticket" data-ticket="${t.id}"><div><strong>${esc(t.ticket_number)} · ${esc(t.subject)}</strong><small>${esc(t.category)} · ${esc(t.status)} · ${new Date(t.updated_at).toLocaleString()}</small></div><button class="btn secondary" data-open>Open</button></article>`).join('') : '<div class="fe-state">No support tickets yet.</div>'; qa('[data-ticket]', list).forEach(r => q('[data-open]', r).onclick = () => openTicket(Number(r.dataset.ticket), load)); }; q('[data-new-ticket]', host).onclick = () => newTicket(load); await load(); }
    async function newTicket(reload) { let d = q('#v132-ticket-new'); if (!d) {
        d = document.createElement('dialog');
        d.id = 'v132-ticket-new';
        d.className = 'fe-dialog';
        d.innerHTML = '<form class="fe-dialog-body"><div class="fe-dialog-head"><h2>New Support Request</h2><button type="button" class="fe-dialog-close">×</button></div><label>Category<select name="category"><option value="account">Account</option><option value="billing">Billing</option><option value="book_access">Book Access</option><option value="api_token">API / Token</option><option value="simulator">Simulator</option><option value="journal">Journal</option><option value="market_commons">Market Commons</option><option value="technical">Technical Problem</option><option value="accessibility">Accessibility</option><option value="bug">Report a Bug</option><option value="other">Other</option></select></label><label>Subject<input name="subject" maxlength="180" required></label><label>Description<textarea name="description" rows="9" required></textarea></label><div class="actions"><button class="btn">Submit Ticket</button></div></form>';
        document.body.appendChild(d);
        q('.fe-dialog-close', d).addEventListener('click', () => d.close());
    } const f = q('form', d); f.onsubmit = async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(f).entries()); try {
        await api('/api/support?action=create', { method: 'POST', body: JSON.stringify(data) });
        d.close();
        f.reset();
        toast('Support request created.', 'ok');
        await reload();
    }
    catch (err) {
        toast(err.message, 'bad');
    } }; d.showModal(); }
    async function openTicket(id, reload) { const j = await api(`/api/support?action=detail&id=${id}`); let d = q('#v132-ticket-detail'); if (!d) {
        d = document.createElement('dialog');
        d.id = 'v132-ticket-detail';
        d.className = 'fe-dialog fe-wide-dialog';
        document.body.appendChild(d);
    } d.innerHTML = `<div class="fe-dialog-head"><h2>${esc(j.ticket.ticket_number)} · ${esc(j.ticket.subject)}</h2><button class="fe-dialog-close">×</button></div><div class="fe-dialog-body"><div class="v132-ticket-thread">${(j.messages || []).map((m) => `<article class="${m.author_kind === 'staff' ? 'staff' : ''}"><strong>${m.author_kind === 'staff' ? 'Support' : 'You'}</strong><p>${esc(m.body)}</p><time>${new Date(m.created_at).toLocaleString()}</time></article>`).join('')}</div>${j.ticket.status === 'closed' ? '<div class="notice">This ticket is closed.</div>' : '<form data-reply><textarea rows="6" required placeholder="Reply…"></textarea><button class="btn">Send Reply</button></form>'}</div>`; q('.fe-dialog-close', d).addEventListener('click', () => d.close(), { once: true }); const f = q('[data-reply]', d); if (f)
        f.onsubmit = async (e) => { e.preventDefault(); await api('/api/support?action=reply', { method: 'POST', body: JSON.stringify({ id, body: q('textarea', f).value }) }); d.close(); await reload(); }; d.showModal(); }
    async function dashboardRepair(){ return; }
    function storeTabs() { if (!/\/store(\.html)?$/.test(path))
        return; const products = q('#store-products'), plans = q('#store-plans'); if (!products || !plans || q('#v132-store-tabs'))
        return; const host = products.parentElement; const tabs = document.createElement('div'); tabs.id = 'v132-store-tabs'; tabs.className = 'v132-store-tabs'; tabs.innerHTML = '<button data-store-tab="books" class="active">Books</button><button data-store-tab="memberships">Memberships</button><button data-store-tab="tools">À-la-Carte Tools</button>'; host.insertBefore(tabs, plans); const tools = document.createElement('div'); tools.id = 'v132-store-tools'; tools.hidden = true; plans.after(tools); const show = async (code) => { qa('[data-store-tab]', tabs).forEach(b => b.classList.toggle('active', b.dataset.storeTab === code)); products.hidden = code !== 'books'; plans.hidden = code !== 'memberships'; tools.hidden = code !== 'tools'; if (code === 'tools' && !tools.dataset.loaded) {
        const s = await sb(), { data } = await s.from('platform_tools').select('tool_code,name,description,individual_price_cents,status,active,public_visible').eq('active', true).eq('public_visible', true).neq('status', 'retired').order('sort_order');
        tools.innerHTML = `<div class="fe-product-grid">${(data || []).map((t) => `<article class="product-card"><div class="eyebrow">À-la-Carte Tool</div><h2>${esc(t.name)}</h2><p>${esc(t.description || '')}</p><div class="v11-price">$${(Number(t.individual_price_cents || 2999) / 100).toFixed(2)}<small>/month</small></div><a class="btn" href="checkout.html?type=tool&code=${encodeURIComponent(t.tool_code)}">Choose Tool</a></article>`).join('')}</div>`;
        tools.dataset.loaded = '1';
    } }; qa('[data-store-tab]', tabs).forEach(b => b.onclick = () => show(b.dataset.storeTab)); show('books'); }
    function homeRedesign() { if (!['/', '/index.html'].includes(path))
        return; const main = q('main'); if (!main || q('#v132-home'))
        return; main.innerHTML = `<div id="v132-home"><section class="v132-home-hero"><div class="wrap v132-home-hero-grid"><div><div class="eyebrow">THE STOCK MARKET: FROM THE GROUND UP</div><h1>Learn the concepts. Practice the decisions. Build the skill.</h1><p>The books teach the core concepts. The platform turns them into guided practice, historical replay, simulation, analysis, decision training, community discussion, and ongoing skill development.</p><div class="actions"><a class="btn" href="learn.html">Start Learning</a><a class="btn secondary" href="store.html">Explore Books & Memberships</a></div></div><div class="v132-hero-panel"><div><strong>Historical Labs</strong><span>Practice without hindsight</span></div><div><strong>Simulator</strong><span>Replay and simulated execution</span></div><div><strong>Journal</strong><span>Process, MFE/MAE, review</span></div><div><strong>Market Tutor</strong><span>Guided learning support</span></div></div></div></section><section class="wrap v132-home-section"><div class="eyebrow">From reading to application</div><h2>A complete learning environment around the books</h2><div class="v132-home-cards"><article><h3>1. Learn</h3><p>Build the vocabulary, structure, risk, execution, and market-reading foundation.</p></article><article><h3>2. Practice</h3><p>Use guided historical Labs and replay to make decisions before outcomes are revealed.</p></article><article><h3>3. Simulate</h3><p>Practice entries, exits, risk, position sizing, and trade management without risking capital.</p></article><article><h3>4. Review</h3><p>Journal the reason for entry and exit, compare Plan vs. Actual, and study MFE/MAE.</p></article></div></section><section class="v132-home-band"><div class="wrap"><h2>More than a book companion.</h2><p>Research workbenches, market-context tools, replay, journaling, analytics, a structured member forum, documentation, and account-level learning progress extend the curriculum into repeatable practice.</p><div class="actions"><a class="btn" href="membership.html">Compare Memberships</a><a class="btn secondary" href="lab-samples.html">Try Sample Labs</a></div></div></section><section class="wrap v132-home-section"><h2>Built for deliberate practice</h2><div class="v132-home-cards"><article><h3>Research</h3><p>Discovery, catalysts, filings, float/supply, watchlists, scanners, and context.</p></article><article><h3>Trade Labs</h3><p>Risk, execution, liquidity, tape, simulation, review, and strategy validation.</p></article><article><h3>Market Commons</h3><p>A structured discussion environment centered on evidence and decision quality.</p></article><article><h3>Member Dashboard</h3><p>Your books, membership, settings, secure connections, support, billing, and activity.</p></article></div></section></div>`; }
    async function adminPanels() { if (!/\/admin(\.html)?$/.test(path))
        return; for (let i = 0; i < 60 && !q('#admin-app'); i++)
        await sleep(100); const app = q('#admin-app'), tabs = q('#admin-tabs'); if (!app || !tabs)
        return; const add = (code, label, title, desc) => { let b = q(`[data-v132-panel="${code}"]`, tabs), p = q(`[data-v132-admin-panel="${code}"]`, app); if (!p) {
        p = document.createElement('section');
        p.className = 'admin-panel';
        p.dataset.v132AdminPanel = code;
        p.innerHTML = `<div class="admin-heading"><div><div class="eyebrow">Operations</div><h1>${title}</h1><p>${desc}</p></div></div><div data-v132-content></div>`;
        app.appendChild(p);
    } if (!b) {
        b = document.createElement('button');
        b.dataset.v132Panel = code;
        b.textContent = label;
        tabs.appendChild(b);
    } b.onclick = () => { qa('.admin-panel').forEach(x => x.classList.remove('active')); qa('#admin-tabs button').forEach(x => x.classList.remove('active')); p.classList.add('active'); b.classList.add('active'); loadAdminPanel(code, q('[data-v132-content]', p)); }; return b; }; add('support', 'Support Queue', 'Support Ticket Queue', 'Search, assign, reply, escalate, resolve, and close member support tickets.'); add('memberactivity', 'Member Activity', 'Member Activity Search', 'Search by username to review member-generated activity.'); add('features', 'Feature Controls', 'Maintenance & Feature Controls', 'Enable or disable site capabilities without database access.'); add('announcements', 'Announcements', 'Site Announcements', 'Publish scheduled information, maintenance, release, or urgent notices.'); add('qa', 'QA & Test Center', 'QA & Test Center', 'Create/delete individual test accounts and run the production acceptance checklist.'); add('archive', 'Archive & Recovery', 'Archive & Recovery', 'Restore archived or disabled site inventory without database access.'); setTimeout(reorganizeAdminGroups, 100); }
    function reorganizeAdminGroups() { /* Retired v0.14.0.9: admin-navigation.js is sole sidebar owner. */ }
    async function loadAdminPanel(code, host) { if (code === 'support')
        await adminSupport(host); if (code === 'memberactivity')
        await adminMemberActivity(host); if (code === 'features')
        await adminFeatures(host); if (code === 'announcements')
        await adminAnnouncements(host); if (code === 'qa')
        await adminQA(host); if (code === 'archive')
        await adminArchive(host); }
    async function adminSupport(host) { host.innerHTML = '<div class="admin-toolbar"><input data-search placeholder="Search ticket, username, email, subject…"><select data-status><option value="">All statuses</option><option>new</option><option>open</option><option>assigned</option><option>waiting_member</option><option>waiting_staff</option><option>escalated</option><option>resolved</option><option>closed</option></select><button class="btn" data-go>Search</button></div><div data-list></div>'; const load = async () => { const search = (q('[data-search]', host)?.value || ''), status = (q('[data-status]', host)?.value || ''); const j = await api(`/api/admin-v013?action=support_queue&q=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`); const list = q('[data-list]', host); list.innerHTML = (j.tickets || []).map((t) => `<article class="admin-card v132-ticket" data-id="${t.id}"><div><strong>${esc(t.ticket_number)} · ${esc(t.subject)}</strong><small>${esc(t.requester?.username || 'Deleted member')} · ${esc(t.status)} · ${esc(t.priority)}</small></div><button class="btn secondary" data-open>Open</button></article>`).join('') || '<div class="fe-state">No matching tickets.</div>'; qa('[data-id]', list).forEach(r => q('[data-open]', r).onclick = () => adminTicket(Number(r.dataset.id), load)); }; q('[data-go]', host).onclick = load; await load(); }
    async function adminTicket(id, reload) { const j = await api(`/api/admin-v013?action=support_ticket_detail&id=${id}`); let d = q('#v132-admin-ticket'); if (!d) {
        d = document.createElement('dialog');
        d.id = 'v132-admin-ticket';
        d.className = 'fe-dialog fe-wide-dialog';
        document.body.appendChild(d);
    } d.innerHTML = `<div class="fe-dialog-head"><h2>${esc(j.ticket.ticket_number)} · ${esc(j.ticket.subject)}</h2><button class="fe-dialog-close">×</button></div><div class="fe-dialog-body"><div class="v132-grid two"><label>Status<select data-status>${['new', 'open', 'assigned', 'waiting_member', 'waiting_staff', 'escalated', 'resolved', 'closed'].map(x => `<option ${j.ticket.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Priority<select data-priority>${['low', 'normal', 'high', 'urgent'].map(x => `<option ${j.ticket.priority === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div><button class="btn secondary" data-update>Update Ticket</button><div class="v132-ticket-thread">${(j.messages || []).map((m) => `<article class="${m.is_internal ? 'internal' : m.author_kind === 'staff' ? 'staff' : ''}"><strong>${m.is_internal ? 'Internal note' : m.author_kind === 'staff' ? 'Staff' : 'Member'}</strong><p>${esc(m.body)}</p><time>${new Date(m.created_at).toLocaleString()}</time></article>`).join('')}</div><form data-reply><textarea rows="6" placeholder="Reply or internal note" required></textarea><label><input type="checkbox" data-internal> Internal note</label><button class="btn">Add Message</button></form></div>`; q('.fe-dialog-close', d).addEventListener('click', () => d.close(), { once: true }); q('[data-update]', d).onclick = async () => { await adminApi('support_ticket_update', { id, status: q('[data-status]', d).value, priority: q('[data-priority]', d).value }); d.close(); await reload(); }; q('[data-reply]', d).onsubmit = async (e) => { e.preventDefault(); await adminApi('support_reply', { id, body: q('textarea', d).value, internal: q('[data-internal]', d).checked }); d.close(); await reload(); }; d.showModal(); }
    async function adminMemberActivity(host) { host.innerHTML = '<div class="admin-toolbar"><input data-user placeholder="Search username…"><button class="btn" data-go>Search Member Activity</button></div><div data-list></div>'; q('[data-go]', host).onclick = async () => { const u = q('[data-user]', host).value.trim(), j = await api(`/api/admin-v013?action=member_activity&username=${encodeURIComponent(u)}`); q('[data-list]', host).innerHTML = (j.entries || []).map((x) => `<div class="admin-list-row"><span><strong>@${esc(x.username || 'member')}</strong><small>${esc(x.activity_type)} · ${new Date(x.created_at).toLocaleString()}</small></span><span>${esc(x.title)}</span></div>`).join('') || '<div class="fe-state">No matching member activity.</div>'; }; }
    async function adminFeatures(host) { const j = await api('/api/admin-v013?action=feature_controls'), rows = j.controls || []; host.innerHTML = `<div class="admin-grid two">${rows.map((x) => `<article class="admin-card"><div class="v13-section-head"><div><div class="eyebrow">${esc(x.category)}</div><h3>${esc(x.label)}</h3><p>${esc(x.description || '')}</p></div><label class="v13-toggle"><input type="checkbox" data-code="${esc(x.feature_code)}" ${x.enabled ? 'checked' : ''}><span class="v13-toggle-track"></span><span>${x.enabled ? 'Enabled' : 'Disabled'}</span></label></div></article>`).join('')}</div>`; qa('[data-code]', host).forEach(sw => sw.onchange = async () => { await adminApi('feature_control_save', { featureCode: sw.dataset.code, enabled: sw.checked }); toast('Feature control saved.', 'ok'); }); }
    async function adminAnnouncements(host) { const j = await api('/api/admin-v013?action=announcements'); host.innerHTML = '<div class="actions"><button class="btn" data-new>New Announcement</button></div><div data-list>' + ((j.announcements || []).map((x) => `<article class="admin-card"><strong>${esc(x.title)}</strong><p>${esc(x.body)}</p><small>${esc(x.audience)} · ${x.active ? 'Active' : 'Disabled'}</small></article>`).join('') || '<div class="fe-state">No announcements.</div>') + '</div>'; q('[data-new]', host).onclick = async () => { const title = prompt('Announcement title:'); if (!title)
        return; const body = prompt('Announcement message:'); if (!body)
        return; await adminApi('announcement_save', { title, body, announcementType: 'info', audience: 'all', active: true }); await adminAnnouncements(host); }; }
    async function adminArchive(host) { const j = await api('/api/admin-v013?action=archive_center'); host.innerHTML = `<section class="admin-card"><div class="v13-section-head"><div><h2>Archive & Recovery</h2><p>Archived or disabled records remain recoverable unless an OWNER performs an eligible hard delete.</p></div></div><div data-archive-list>${(j.items || []).map((x) => `<div class="admin-list-row" data-type="${esc(x.type)}" data-id="${esc(x.id)}"><span><strong>${esc(x.label)}</strong><small>${esc(x.type)} · ${esc(x.state || 'archived')}</small></span><button class="btn secondary" data-restore>Restore</button></div>`).join('') || '<div class="fe-state">Nothing is currently archived or disabled.</div>'}</div></section>`; qa('[data-restore]', host).forEach(b => b.onclick = async () => { const r = b.closest('[data-type]'); await adminApi('archive_restore', { type: r.dataset.type, id: r.dataset.id }); toast('Item restored.', 'ok'); await adminArchive(host); }); }
    async function adminQA(host) { const [ta, qaJ] = await Promise.all([api('/api/admin-v013?action=test_accounts'), api('/api/admin-v013?action=qa_acceptance')]); host.innerHTML = `<section class="admin-card"><div class="v13-section-head"><div><h2>Test Accounts</h2><p>Create or remove disposable accounts individually.</p></div><select data-preset>${(ta.presets || []).map((p) => `<option value="${esc(p.preset_code)}">${esc(p.label)}</option>`).join('')}</select><button class="btn" data-create>Create Test Account</button></div><div data-accounts>${(ta.accounts || []).map((a) => `<div class="admin-list-row" data-user="${a.user_id}"><span><strong>${esc(a.label)} — ${esc(a.user?.email || '')}</strong><small>${esc(a.preset_code)} · TEST ACCOUNT</small></span><div class="actions"><button class="btn secondary" data-reset>Prepare Test Login</button><button class="btn secondary" data-duplicate>Duplicate</button><button class="btn danger" data-delete>Delete</button></div></div>`).join('') || '<div class="fe-state">No test accounts.</div>'}</div></section><section class="admin-card"><h2>Admin Operational Coverage</h2><p>Routine operations should be available here rather than through direct database editing.</p><div class="v132-coverage"><table><thead><tr><th>System</th><th>View</th><th>Add</th><th>Edit</th><th>Enable/Disable</th><th>Archive/Delete</th><th>Configure</th></tr></thead><tbody>${['Accounts & Access', 'Books & Catalog', 'Labs & Learning', 'Memberships & Tools', 'Store & Checkout', 'Advertising', 'Market Data', 'Market Commons', 'Support', 'Policies', 'Navigation & Site Settings', 'Test Accounts'].map(x => `<tr><td>${x}</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>`).join('')}</tbody></table></div></section><section class="admin-card"><h2>Frontend Acceptance Console</h2><div class="v132-qa-grid">${(qaJ.items || []).map((x) => `<div data-qa="${x.item_code}"><strong>${esc(x.label)}</strong><select><option value="untested" ${x.status === 'untested' ? 'selected' : ''}>Untested</option><option value="pass" ${x.status === 'pass' ? 'selected' : ''}>Pass</option><option value="fail" ${x.status === 'fail' ? 'selected' : ''}>Fail</option><option value="retest_required" ${x.status === 'retest_required' ? 'selected' : ''}>Retest Required</option></select></div>`).join('')}</div></section>`; q('[data-create]', host).onclick = async () => { const preset = q('[data-preset]', host).value, j = await adminApi('test_account_create', { presetCode: preset }); alert(`TEST ACCOUNT CREATED\nEmail: ${j.account.email}\nUsername: ${j.account.username}\nPassword: ${j.account.password}\n\nSave this one-time password.`); await adminQA(host); }; qa('[data-user]', host).forEach(r => { q('[data-reset]', r).onclick = async () => { const j = await adminApi('test_account_reset', { userId: r.dataset.user }); alert(`TEST LOGIN PREPARED\nEmail: ${j.account.email}\nUsername: ${j.account.username}\nPassword: ${j.account.password}\n\nOpen Sign In in a private/incognito window so your OWNER session remains isolated.`); }; q('[data-duplicate]', r).onclick = async () => { const j = await adminApi('test_account_duplicate', { userId: r.dataset.user }); alert(`TEST ACCOUNT DUPLICATED\nEmail: ${j.account.email}\nUsername: ${j.account.username}\nPassword: ${j.account.password}`); await adminQA(host); }; q('[data-delete]', r).onclick = async () => { const phrase = prompt('Type DELETE ACCOUNT exactly to permanently delete this test account.'); if (phrase !== 'DELETE ACCOUNT')
        return; await adminApi('test_account_delete', { userId: r.dataset.user, confirmation: phrase }); await adminQA(host); }; }); qa('[data-qa]', host).forEach(r => q('select', r).onchange = async (e) => { await adminApi('qa_acceptance_save', { itemCode: r.dataset.qa, status: e.target.value }); }); }
    function adminFormPolish() {
        if (!/\/admin(\.html)?$/.test(path))
            return;
        document.body.classList.add('v132-admin');
        const obs = new MutationObserver(() => {
            qa('textarea').forEach(t => t.classList.add('v132-admin-textarea'));
            qa('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),select').forEach(x => x.classList.add('v132-admin-control'));
            qa('[data-book]').forEach(card => {
                if (q('[data-v132-delete-book]', card))
                    return;
                const actions = q('.actions', card);
                if (!actions)
                    return;
                const b = document.createElement('button');
                b.className = 'btn danger';
                b.dataset.v132DeleteBook = '1';
                b.textContent = 'Delete Book';
                b.onclick = async () => { const phrase = prompt('Permanent deletion is allowed only when there are no dependent records. Type DELETE BOOK exactly:'); if (phrase !== 'DELETE BOOK')
                    return; try {
                    await adminApi('book_delete', { productCode: card.dataset.book, confirmation: phrase });
                    card.remove();
                    toast('Book deleted.', 'ok');
                }
                catch (err) {
                    toast(err.message, 'bad');
                } };
                actions.appendChild(b);
            });
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => obs.disconnect(), 30000);
    }
    function forumPolish() { if (!/\/market-commons(\.html)?$/.test(path))
        return; document.body.classList.add('v132-forum'); const host = q('#v13-commons'); if (!host)
        return; const obs = new MutationObserver(() => { qa('.v13-topic-row', host).forEach(row => { if (q('.v132-topic-cols', row))
        return; const meta = q('.v13-topic-meta:last-child', row); if (meta) {
        meta.classList.add('v132-topic-cols');
        meta.innerHTML = `<span class="v132-col-label">Replies</span><strong>${esc((meta.textContent || '').replace(/[^0-9]/g, '') || '0')}</strong>`;
    } }); }); obs.observe(host, { childList: true, subtree: true }); }
    async function init() { normalizeHeaderSearch(); profileMenuCleanup(); createAccountUpgrade(); storeTabs(); homeRedesign(); forumPolish(); adminFormPolish(); setTimeout(notificationCenter, 500); setTimeout(adminPanels, 800); await dashboardRepair(); }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
    else
        setTimeout(init, 200);
})();
