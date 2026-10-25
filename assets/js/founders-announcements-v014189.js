/* v0.14.0.206: confidential official founding announcements, RLS-targeted by account tier.
 * Reuse pinned topics for navigable discussion; private notices are server-filtered.
 */
(()=>{'use strict';
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
async function run(){
 const host=document.getElementById('gu-f600-notices');if(!host)return;
 try{
  const sb=await window.getSupabaseClient();
  if(!(await sb.auth.getUser()).data?.user)return;
  const access=await sb.rpc('gu_founder_commons_access_v014174',{p_scope:'shared'});
  if(access.error||access.data!==true){
   host.replaceChildren(make('p','Private announcements require eligible founding access.'));return
  }
  const notices=await sb.from('gu_founder_targeted_notices_v014206')
    .select('id,title,body,audience,priority,published_at')
    .eq('publication_state','published')
    .order('published_at',{ascending:false}).limit(30);
  host.replaceChildren();
  if(notices.error){host.append(make('p','Priority announcements are temporarily unavailable.'));return}
  for(const n of notices.data||[]){
   const card=make('article',undefined,'gu-f600-ballot');card.setAttribute('role','listitem');
   const eyebrow=make('p',n.audience==='council'?'EXTENDED DESIGN COUNCIL':'FOUNDERS COMMUNITY','gu-f600-eyebrow');
   card.append(eyebrow,make('h3',n.title),make('p',n.body));
   if(n.priority==='important')card.append(make('p','Priority notice'));
   host.append(card);
  }
  const scope=await sb.rpc('gu_founder_commons_access_v014174',{p_scope:'council'});
  const codes=['F600_HEADQUARTERS'];if(!scope.error&&scope.data===true)codes.push('F600_COUNCIL');
  const posts=await sb.from('commons_topics').select('id,title,forum_code').in('forum_code',codes)
    .eq('is_official',true).eq('is_pinned',true).eq('status','published')
    .order('created_at',{ascending:false}).limit(5);
  if(!posts.error)for(const item of posts.data||[]){
   const row=make('article',undefined,'gu-f600-issue');row.setAttribute('role','listitem');
   const label=make('div');label.append(make('strong',item.title),make('span',item.forum_code==='F600_COUNCIL'?'Extended Council':'Founders Headquarters'));
   const a=make('a','Read discussion');a.href='market-commons.html?topic='+Number(item.id);
   row.append(label,a);host.append(row);
  }
  if(!host.childNodes.length)host.append(make('p','No priority announcements are currently published.'));
 }catch{host.replaceChildren(make('p','Founder announcements could not be verified.'))}
}
run();
})();