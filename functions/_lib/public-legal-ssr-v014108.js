/* v0.14.0.108: render ONLY published public legal records server-side.
 * No service-role access, no private user data, no external Markdown libraries.
 * If Supabase is unavailable, leave the existing client-side legal fallback.
 */
export const publicLegalPaths=Object.freeze({
 '/privacy.html':'PRIVACY','/terms.html':'TERMS',
 '/refund-policy.html':'REFUNDS','/cookie-policy.html':'COOKIES',
 '/subscription-terms.html':'SUBSCRIPTION'
});
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
function inline(input){return e(input).replace(/\*\*([^*]{1,200})\*\*/g,'<strong>$1</strong>')
 .replace(/\x60([^\x60]{1,150})\x60/g,'<code>$1</code>')}
export function publishedPolicyHtml(row){
 if(!row||typeof row.body_markdown!=='string'||!row.body_markdown.trim()||
   row.body_markdown.length>100000||String(row.status)!=='published')return null;
 const updated=Date.parse(String(row.effective_at||'')),now=Date.now();
 if(!Number.isFinite(updated)||updated>now)return null;
 const lines=row.body_markdown.replace(/\r/g,'').split('\n');
 const html=[];let pending=[],items=[];
 const para=()=>{if(pending.length){html.push('<p>'+inline(pending.join(' '))+'</p>');pending=[]}};
 const list=()=>{if(items.length){html.push('<ul>'+items.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ul>');items=[]}};
 for(const raw of lines){
  const line=raw.trim();
  if(!line){para();list();continue}
  const heading=/^(#{1,4})\s+(.+)$/.exec(line);
  if(heading){para();list();const level=heading[1].length;html.push('<h'+level+'>'+inline(heading[2])+'</h'+level+'>');continue}
  const li=/^[-*]\s+(.+)$/.exec(line);
  if(li){para();items.push(li[1]);continue}
  list();pending.push(line);
 }
 para();list();
 return '<div class="eyebrow">Policy · Version '+e(String(row.version||''))+'</div>'+
  '<h1>'+e(row.title||'Published Policy')+'</h1>'+
  '<p><small>Effective <time datetime="'+e(new Date(updated).toISOString().slice(0,10))+'">'+
   e(new Date(updated).toISOString().slice(0,10))+'</time></small></p>'+
  '<article class="v13-card v132-policy-body">'+html.join('')+'</article>';
}
export async function getPublishedPolicyMarkup(env,request){
 const path=new URL(request.url).pathname.toLowerCase(),code=publicLegalPaths[path];
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),
  key=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(!code||!/^https:\/\/[^/]+$/.test(base)||!key)return null;
 try{
  const url=base+'/rest/v1/legal_documents?select=document_code,title,status,version,effective_at,body_markdown'+
   '&document_code=eq.'+code+'&status=eq.published&limit=1';
  const result=await fetch(url,{method:'GET',cache:'no-store',headers:{apikey:key,accept:'application/json'}});
  if(!result.ok)return null;
  const rows=await result.json();
  if(!Array.isArray(rows)||rows.length!==1||rows[0].document_code!==code)return null;
  const markup=publishedPolicyHtml(rows[0]);
  return markup?{markup,title:String(rows[0].title||'Policy').slice(0,120)}:null;
 }catch{return null}
}
