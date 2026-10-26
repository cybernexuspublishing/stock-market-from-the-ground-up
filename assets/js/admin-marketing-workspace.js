/* Presentation controller for the existing Owner-only advertising workflow.
 * Retains every form node, ID, event handler and backend operation. No writes.
 */
(()=>{'use strict';
const sections=[
 ['overview','Marketing overview','Campaign summary & workflow'],
 ['inventory','Ad inventory & placements','Placement availability and rate cards'],
 ['sponsors','Sponsor requests & advertisers','Inquiries, review and advertiser records'],
 ['campaigns','Campaign management','Draft campaigns and approvals'],
 ['creative','Advertisement creator','Creative submission and review'],
 ['social','Social media management','Account and integration status'],
 ['promotion','Promotion & analytics','Promotional destinations and recorded reports'],
 ['administration','Marketing administration','Permissions, audit history and billing'],
 ['sandbox','Stripe Sandbox QA','Existing TEST-only acceptance controls']
];
const groups={inventory:['gu-ad-placements','gu-ad-packages'],sponsors:['gu-ad-inquiries','gu-ad-advertiser-form'],campaigns:['gu-ad-campaign-form','gu-ad-campaigns'],creative:['gu-ad-creative-form'],promotion:['gu-ad-metrics'],sandbox:['gu-ad-sandbox-title']};
const q=id=>document.getElementById(id);
let mounted=false,current='overview';
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function link(href,text){const a=node('a',text,'marketing-workflow-link');a.href=href;return a}
function select(key,focus=false){
 if(!sections.some(x=>x[0]===key))key='overview';current=key;
 for(const area of document.querySelectorAll('[data-marketing-area]'))area.hidden=area.dataset.marketingArea!==key;
 for(const button of document.querySelectorAll('[data-marketing-view]'))button.setAttribute('aria-current',button.dataset.marketingView===key?'page':'false');
 const heading=q('marketing-workspace-title');heading.textContent=sections.find(x=>x[0]===key)[1];if(focus)heading.focus();
 if(location.hash!=='#'+key)history.replaceState(history.state,'',location.pathname+location.search+'#'+key);
}
function area(root,key){const e=node('section',undefined,'marketing-area');e.dataset.marketingArea=key;e.hidden=true;root.append(e);return e}
function textBlock(host,title,description){const a=node('article',undefined,'marketing-summary-row');a.append(node('h3',title),node('p',description));host.append(a);return a}
function mount(counts){
 const main=q('gu-ad-admin-main');if(!main||main.hidden)return;
 if(mounted){for(const [name,value] of Object.entries(counts||{})){const x=q('marketing-count-'+name);if(x)x.textContent=String(value)}return}
 mounted=true;
 const original=[...main.children];const shell=node('div',undefined,'marketing-workspace');const menu=node('nav',undefined,'marketing-workspace-nav');menu.setAttribute('aria-label','Commerce marketing workspaces');
 menu.append(node('p','COMMERCE','eyebrow'),node('h2','Marketing & Social Media'));
 for(const [key,label,description] of sections){const b=node('button');b.type='button';b.dataset.marketingView=key;b.append(node('strong',label),node('small',description));b.addEventListener('click',()=>select(key,true));menu.append(b)}
 menu.append(link('admin.html#commerce','← Commerce & billing'));
 const content=node('div',undefined,'marketing-workspace-content');const title=node('h2');title.id='marketing-workspace-title';title.tabIndex=-1;content.append(title);
 const overview=area(content,'overview');const stats=node('div',undefined,'marketing-metrics');
 for(const [key,label] of [['campaigns','Campaign records'],['inquiries','Sponsor requests'],['advertisers','Advertiser records'],['creatives','Creative records']]){const s=node('article');const n=node('strong',String(counts?.[key]??0));n.id='marketing-count-'+key;s.append(n,node('span',label));stats.append(s)}overview.append(stats);
 textBlock(overview,'One advertising workflow','Review sponsor requests, register qualified advertisers, create a draft campaign, submit creative, then use the existing approval workflow. No step here initiates a charge.');
 const flow=node('div',undefined,'marketing-workflow');for(const [key,label] of [['sponsors','1. Review requests'],['campaigns','2. Prepare campaign'],['creative','3. Review creative'],['promotion','4. Review recorded results']]){const b=node('button',label,'btn secondary');b.type='button';b.addEventListener('click',()=>select(key,true));flow.append(b)}overview.append(flow);
 const destinations={};for(const [key] of sections)if(key!=='overview')destinations[key]=area(content,key);
 const assigned=new Set();for(const [key,ids] of Object.entries(groups))for(const id of ids){const section=q(id)?.closest('.gu-ad-panel');if(section&&!assigned.has(section)){destinations[key].append(section);assigned.add(section)}}
 // Keep any installed/unrecognized operational section visible in Overview.
 for(const section of original)if(!assigned.has(section))overview.append(section);
 const social=destinations.social;
 textBlock(social,'X · @SMFGUAcademy','Intended company account. A verified publishing connection has not been established in this Admin module. No credentials are stored or inferred from the account name.');
 textBlock(social,'Saved posts and community journal','The free Owner-only Post Studio and X Communities directory are available below after database setup. Planning dates are internal reminders. External publishing is recorded manually, not verified by X.');
 textBlock(social,'Automatic X publishing and joining','Not implemented in this release. Official X authorization and a nonzero approved API budget are not available. Community membership actions occur in X, not through automation.');
 textBlock(social,'Zero-cost scope','No subscription or paid advertising service has been purchased or authorized by this workspace.');
 const promotion=destinations.promotion;const campaigns=textBlock(promotion,'Promotion destinations','Use the existing public pages as approved campaign destinations; editing a campaign remains in Campaign management.');
 campaigns.append(link('store.html#founders','Founding 600 offers'),link('bootcamp-academy.html','Boot Camp Academy'),link('labs.html','Lab directory'));
 textBlock(promotion,'Referrals and leads','Cross-platform referral attribution is not implemented here. Recorded ad impressions and clicks below come from the existing advertising system; missing metrics are not estimated.');
 const administration=destinations.administration;textBlock(administration,'Owner-only operations','The existing advertising API verifies Owner authority on every request. Navigation organization does not grant permission. Existing audited advertiser, campaign and creative operations remain authoritative.');
 administration.append(link('admin.html#audit','Open existing activity & audit history'),link('admin.html#commerce','Open existing Commerce & reconciliation'),link('admin.html#roles','Open existing roles & permissions'));
 textBlock(administration,'Payment and publishing boundaries','Existing Stripe Sandbox controls are isolated under Stripe Sandbox QA. LIVE payment testing, paid advertising and external social publishing have not been enabled by this navigation change.');
 shell.append(menu,content);main.append(shell);window.dispatchEvent(new CustomEvent('groundup:marketing-social-ready',{detail:{container:social}}));window.addEventListener('hashchange',()=>select(location.hash.slice(1)));select(location.hash.slice(1)||'overview');
}
window.addEventListener('groundup:ad-admin-ready',event=>mount(event.detail));
})();
