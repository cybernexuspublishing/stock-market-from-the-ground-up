/* v0.14.0.17 optional advanced community actions. No privileged client writes.
 * Only active when reviewed RPC migration is installed; all permissions enforced by Supabase.
 */
(()=>{'use strict';
 if(!/^\/(?:forum-topic|market-commons)(?:\.html)?$/.test(location.pathname))return;
 const scope=/forum-topic/.test(location.pathname)?'legacy':'commons';
 const topicId=Number(new URLSearchParams(location.search).get(scope==='legacy'?'id':'topic'));
 if(!Number.isSafeInteger(topicId)||topicId<1)return;
 let client=null,active=false,ui=null,quotes=new Map(),thanks=new Map(),pollModel=null,failedUntil=0;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const replySelector=scope==='legacy'?'.forum-post[id^="post-"]':'[data-forum-content="post"][data-content-id]';
 const rootSelector=scope==='legacy'?'#topic-content':'.v13-topic-detail';
 const calls={state:'gu_forum_interaction_state',poll:'gu_forum_poll_get',votes:'gu_forum_thanks_for_topic'};
 async function rpc(name,args){if(!client)client=await window.getSupabaseClient();const {data:{session}}=await client.auth.getSession();if(!session)throw Error('Please sign in first.');const {data,error}=await client.rpc(name,args);if(error)throw Error(error.message||'Forum action unavailable');return data}
 function say(text){const el=ui?.querySelector('[data-gu-status]');if(el)el.textContent=text}
 function baseArgs(){return {p_scope:scope,p_topic_id:topicId}}
 function replyArea(){return scope==='legacy'?document.querySelector('#reply-body'):document.querySelector('.v13-topic-detail form textarea')}
 function currentSource(el){const raw=el.querySelector('.forum-post-body,.v13-post-body,[data-post-body]')||el;return String(raw.innerText||raw.textContent||'').trim().slice(0,900)}
 function addPostTools(){if(!ui)return;for(const post of document.querySelectorAll(replySelector)){
  if(post.dataset.guExtras==='1')continue;
  const id=Number(scope==='legacy'?post.id.replace(/^post-/,''):post.dataset.contentId);
  if(!Number.isSafeInteger(id)||id<1)continue;
  post.dataset.guExtras='1';if(!post.id)post.id='post-'+id;
  const row=document.createElement('div');row.className='gu-post-extras';row.setAttribute('aria-label','Post actions');
  const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.setAttribute('aria-label','Select reply for multiquote');label.append(checkbox,' Quote');checkbox.onchange=()=>{if(checkbox.checked){if(quotes.size>=5){checkbox.checked=false;say('Select at most five replies.');return}quotes.set(id,currentSource(post))}else quotes.delete(id)};row.append(label);
  const cite=document.createElement('button');cite.type='button';cite.className='btn secondary';cite.textContent='Quote';cite.onclick=()=>quoteOne(id,currentSource(post));row.append(cite);
  const like=document.createElement('button');like.type='button';like.className='btn secondary';like.dataset.guThankId=id;like.textContent='Thank';like.onclick=()=>toggleThanks('post',id,like);row.append(like);
  const link=document.createElement('a');link.href=location.pathname+location.search+'#post-'+id;link.textContent='Permalink';link.className='btn secondary';link.setAttribute('aria-label','Direct link to reply '+id);row.append(link);
  post.append(row);
  applyThanks('post',id,like);
 }}
 function applyThanks(kind,id,button){const x=thanks.get(kind+':'+id);if(!x)return;button.textContent=(x.mine?'Remove thanks':'Thank')+' ('+Number(x.count||0)+')';button.setAttribute('aria-pressed',String(!!x.mine))}
 async function toggleThanks(kind,id,button){button.disabled=true;try{const x=await rpc('gu_forum_toggle_thanks',{p_scope:scope,p_kind:kind,p_id:id});thanks.set(kind+':'+id,{mine:x.active,count:x.count});applyThanks(kind,id,button);say('Thanks updated.')}catch(e){say(e.message)}finally{button.disabled=false}}
 function quoteOne(id,body){const area=replyArea();if(!area){say('Open the reply form to quote this post.');return}const snippet=`[quote]${body.replace(/\[\/quote\]/gi,'[/ quote ]').slice(0,900)}[/quote]\n`;if(area.value.length+snippet.length>Number(area.maxLength||10000)){say('Quote would exceed the message limit.');return}area.setRangeText(snippet,area.selectionStart,area.selectionEnd,'end');area.focus();area.dispatchEvent(new Event('input',{bubbles:true}));say('Quote added to your reply.')}
 function showPoll(model,author){const box=ui.querySelector('[data-gu-poll]');box.replaceChildren();const p=model?.poll;pollModel=p;if(!p){if(author){const create=document.createElement('button');create.type='button';create.className='btn secondary';create.textContent='Add a poll to your discussion';create.onclick=()=>showPollForm(box);box.append(create)}return}
  const h=document.createElement('h3');h.textContent=p.question;box.append(h);
  const form=document.createElement('form');form.className='gu-poll-form';const group=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=(p.allow_multiple?'Select one or more answers':'Select one answer')+(p.closed?' (closed)':'');group.append(legend);
  const optionInputs=[];for(const opt of p.options||[]){const l=document.createElement('label');l.className='gu-poll-choice';const input=document.createElement('input');input.type=p.allow_multiple?'checkbox':'radio';input.name='poll-option';input.value=String(opt.id);input.disabled=!!p.closed||!!p.has_voted;optionInputs.push(input);const text=document.createElement('span');text.textContent=opt.label;const count=document.createElement('small');count.textContent=String(opt.votes||0)+' vote(s)';l.append(input,text,count);group.append(l)}form.append(group);
  const small=document.createElement('p');small.className='small';small.textContent=(p.closed?'This poll has closed.':p.closes_at?'Voting closes '+new Date(p.closes_at).toLocaleString(): 'This poll has no end date.')+(p.has_voted?' You already voted.':'');form.append(small);
  if(!p.closed&&!p.has_voted){const submit=document.createElement('button');submit.type='submit';submit.textContent='Submit vote';submit.className='btn';form.append(submit);form.onsubmit=async e=>{e.preventDefault();const selected=optionInputs.filter(x=>x.checked).map(x=>Number(x.value));if(!selected.length){say('Select at least one answer.');return}submit.disabled=true;try{await rpc('gu_forum_poll_vote',{...baseArgs(),p_option_ids:selected});say('Vote recorded.');await loadPoll()}catch(err){say(err.message)}finally{submit.disabled=false}}}
  box.append(form);
 }
 function showPollForm(box){box.innerHTML=`<form class="gu-poll-create"><h3>Add Poll</h3><label>Question<input name="question" minlength="10" maxlength="300" required></label><label>Answer choices (one per line, 2–12)<textarea name="options" required rows="7" placeholder="Choice A\nChoice B"></textarea></label><label><input name="multiple" type="checkbox"> Allow selecting multiple answers</label><label>Closes at (optional, 5 minutes to 60 days)<input type="datetime-local" name="closes"></label><div class="actions"><button type="submit" class="btn">Publish poll</button><button type="button" class="btn secondary" data-gu-poll-cancel>Cancel</button></div><p class="gu-poll-rule">Votes are final. Polls are not supported in Historical Lab discussions.</p></form>`;
  const form=box.querySelector('form');form.querySelector('[data-gu-poll-cancel]').onclick=()=>loadPoll();form.onsubmit=async e=>{e.preventDefault();const question=form.elements.question.value.trim(),options=form.elements.options.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),closes=form.elements.closes.value;if(options.length<2||options.length>12){say('Use 2–12 answer choices.');return}const btn=form.querySelector('[type=submit]');btn.disabled=true;try{await rpc('gu_forum_poll_create',{...baseArgs(),p_question:question,p_options:options,p_allow_multiple:form.elements.multiple.checked,p_closes_at:closes?new Date(closes).toISOString():null});say('Poll published.');await loadPoll()}catch(ex){say(ex.message)}finally{btn.disabled=false}};
 }
 async function loadPoll(){try{const r=await rpc('gu_forum_poll_get',baseArgs());showPoll(r,r?.is_author)}catch(e){say('Poll unavailable: '+e.message)}}
 function render(){if(ui)return;const parent=document.querySelector(rootSelector);if(!parent)return;
  const heading=parent.querySelector('h1,.v13-post,#topic-body')||parent;
  ui=document.createElement('section');ui.className='gu-community-tools';ui.setAttribute('aria-label','Discussion tools');
  ui.innerHTML='<h2>Discussion tools</h2><div class="gu-community-actions"><button type="button" class="btn secondary" data-gu-subscribe>Subscribe</button><label>Rate this discussion <select data-gu-rating aria-label="Discussion rating"><option value="">Choose rating</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></label><button type="button" class="btn secondary" data-gu-thanks>Thank the author</button><button type="button" class="btn secondary" data-gu-multiquote>Quote selected replies</button><button type="button" class="btn secondary" data-gu-print>Print</button><a class="btn secondary" data-gu-email>Email link</a></div><p data-gu-rating-summary class="small"></p><label class="gu-thread-search">Search replies shown on this page<input type="search" data-gu-search placeholder="Filter loaded replies…"></label><div data-gu-poll></div><p data-gu-status role="status" aria-live="polite"></p>';
  heading.insertAdjacentElement('afterend',ui);
  const subscription=ui.querySelector('[data-gu-subscribe]');subscription.onclick=async()=>{subscription.disabled=true;try{const on=await rpc('gu_forum_toggle_subscription',baseArgs());subscription.textContent=on?'Unsubscribe':'Subscribe';say(on?'Subscribed to this discussion. Notification delivery depends on future system integration.':'Unsubscribed.')}catch(e){say(e.message)}finally{subscription.disabled=false}};
  const rating=ui.querySelector('[data-gu-rating]');rating.onchange=async()=>{if(!rating.value)return;rating.disabled=true;try{const res=await rpc('gu_forum_rate_topic',{...baseArgs(),p_rating:Number(rating.value)});ui.querySelector('[data-gu-rating-summary]').textContent=res.average+' / 5 ('+res.count+' ratings)';say('Rating saved.')}catch(e){say(e.message)}finally{rating.disabled=false}};
  const like=ui.querySelector('[data-gu-thanks]');like.onclick=()=>toggleThanks('topic',topicId,like);
  ui.querySelector('[data-gu-print]').onclick=()=>window.print();
  ui.querySelector('[data-gu-email]').href='mailto:?subject='+encodeURIComponent(document.title)+'&body='+encodeURIComponent(location.href);
  ui.querySelector('[data-gu-search]').addEventListener('input',e=>{const q=e.target.value.toLowerCase();for(const p of document.querySelectorAll(replySelector))p.hidden=!!q&&!p.textContent.toLowerCase().includes(q)});
  ui.querySelector('[data-gu-multiquote]').onclick=()=>{const parts=[...quotes].slice(0,5);if(!parts.length){say('Check at least one reply to quote.');return}for(const [id,text] of parts)quoteOne(id,text);say(parts.length+' quotes inserted into the reply.');for(const p of document.querySelectorAll(replySelector)){const checkbox=p.querySelector('.gu-post-extras input[type=checkbox]');if(checkbox)checkbox.checked=false}quotes.clear()};
 }
 async function populate(){if(active||Date.now()<failedUntil)return;render();if(!ui)return;active=true;
  try{const [state,votes]=await Promise.all([rpc(calls.state,baseArgs()),rpc(calls.votes,baseArgs())]);ui.querySelector('[data-gu-subscribe]').textContent=state?.subscribed?'Unsubscribe':'Subscribe';ui.querySelector('[data-gu-rating-summary]').textContent=state?.rating_count?(state.rating_average+' / 5 ('+state.rating_count+' ratings)'):'No ratings yet.';
   for(const t of votes||[])thanks.set(t.kind+':'+t.id,{mine:!!t.mine,count:t.count});applyThanks('topic',topicId,ui.querySelector('[data-gu-thanks]'));addPostTools();await loadPoll();
  }catch(e){ui?.remove();ui=null;active=false;failedUntil=Date.now()+60000;}
 }
 let timer=null;
 function scan(){const root=document.querySelector(rootSelector);if(!root)return;if(!ui)populate();else addPostTools()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
 new MutationObserver(mutations=>{if(timer||!mutations.some(m=>m.addedNodes.length))return;timer=setTimeout(()=>{timer=null;scan()},100)}).observe(document.body,{childList:true,subtree:true});
})();
