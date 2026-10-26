// Real Dashboard support route must operate through the existing private
// support_tickets API and never display another member's data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('dashboard.html','utf8');
const dashboard=readFileSync('assets/js/dashboard.js','utf8');
const client=readFileSync('assets/js/member-support-panel.js','utf8');
const server=readFileSync('functions/api/support.js','utf8');

for(const token of ['id="member-support-panel"','id="member-support-form"',
 'id="member-support-status"','id="member-support-list"',
 'id="member-support-detail"','href="dashboard.html?tab=support"',
 'src="assets/js/member-support-panel.js"',
 'role="status"','aria-live="polite"','name="subject"','name="description"']){
 assert(html.includes(token),'Missing accessible Support control '+token);
}
assert(html.includes('data-auth-required="true"'));
assert(dashboard.includes("get('tab') === 'support'"),
 'Dashboard must honor the linked Support route');
assert(dashboard.includes('if (viewingSupport) return;'),
 'When viewing Support, hidden Overview should not fetch unrelated private information');
for(const action of ["call('list')","call('detail'","call('create'","call('reply'","call('reopen'"]){
 assert(client.includes(action),'Missing working Support action '+action);
}
assert(client.includes("client.auth.getUser()"));
assert(client.includes("client.auth.getSession()"));
assert(client.includes("session.user.id!==memberId")||client.includes("value.user?.id!==memberId"),
 'Every ticket request must verify the same member session');
assert(client.includes("clearPrivate()"), 'Account switches must clear ticket content');
assert(client.includes("credentials:'same-origin'"));
assert(client.includes("cache:'no-store'"));
assert(client.includes("authorization:'Bearer '+token"));
assert(client.includes("document.createElement("));
assert(client.includes("textContent="));
assert(!client.includes("list.innerHTML="));
assert(!client.includes("detail.innerHTML="));
assert(!client.includes("localStorage"));
assert(!client.includes("service_role"));
assert(html.includes("FOUNDING BETA"));
assert(server.includes("requester_user_id=eq."));
assert(server.includes('profiles?select=account_kind'),'Private Support must verify real member kind');
assert(server.includes("rows[0]?.account_kind!=='member'"),'Synthetic identities must be rejected before ticket I/O');
assert(html.includes('id="member-support-context"'));
const player=readFileSync('lab-player.html','utf8');
const playerJS=readFileSync('assets/js/lab-player.js','utf8');
assert(player.includes('id="player-report-issue"'));
assert(playerJS.includes("dashboard.html?tab=support&lab="),'Lab problem link must carry a validated canonical ID');
assert(server.includes("is_internal=eq.false"));
assert(server.includes("action==='reopen'"));
assert(server.includes("action==='reply'"));
assert(server.includes("action==='create'"));
assert(server.includes("action==='list'"));
assert(server.includes("action==='detail'"));
console.log('PASS Beta member Support: real existing endpoint, private owner filtering, create/list/detail/reply/reopen, no untrusted HTML or UI-only authorization.');
