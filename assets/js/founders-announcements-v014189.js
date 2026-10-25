/* Official notices stay in RLS-protected Founders Commons, not public feeds. */
(()=>{'use strict';
const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n};
async function run(){
 const host=document.getElementById('gu-f600-notices');if(!host)return;
 try{
  const sb=await window.getSupabaseClient();
  if(!(await sb.auth.getUser()).data?.user)return;
  const {data:shared,error:accessError}=await sb.rpc('gu_founder_commons_access_v014174',{p_scope:'shared'});
  if(accessError||shared!==true){host.replaceChildren(make('p','Private announcements require founding membership access.'));return}
  const {data:extended,error:extendedError}=await sb.rpc('gu_founder_commons_access_v014174',{p_scope:'council'});
  const forumCodes=['F600_HEADQUARTERS'];
  if(!extendedError&&extended===true)forumCodes.push('F600_COUNCIL');
  const {data,error}=await sb.from('commons_topics').select('id,title,forum_code,created_at')
   .in('forum_code',forumCodes).eq('is_official',true).eq('is_pinned',true).eq('status','published')
   .order('created_at',{ascending:false}).limit(8);
  if(error){host.replaceChildren(make('p','Official announcements could not be loaded.'));return}
  host.replaceChildren();
  for(const item of data||[]){
   const row=make('article');row.className='gu-f600-issue';row.setAttribute('role','listitem');
   const details=make('div'),title=make('strong',item.title||'Official update');
   const tier=make('span',item.forum_code==='F600_COUNCIL'?'Extended Design Council':'Founders Headquarters');
   details.append(title,tier);
   const url=make('a','Read update');url.href='market-commons.html?topic='+Number(item.id);
   row.append(details,url);host.append(row);
  }
  if(!host.childNodes.length)host.append(make('p','No priority founder announcements are currently pinned.'));
 }catch{host.replaceChildren(make('p','Official announcements could not be verified.'))}
}
run();
})();