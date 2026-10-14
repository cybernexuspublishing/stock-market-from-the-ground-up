from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
js=(root/'assets/js/forum-interactions.js').read_text()
js=js.replace(" if(!/^\\/(?:forum-topic|market-commons)(?:\\.html)?$/.test(location.pathname))return;", " if(false)return;")
js=js.replace(" const topicId=Number(new URLSearchParams(location.search).get(scope==='legacy'?'id':'topic'));", " const topicId=9;")
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':840})
 page.set_content('''<div class="v13-topic-detail"><article class="v13-post" data-forum-content="topic" data-content-id="9"><h1>Community thread</h1></article><form><textarea maxlength="10000" id="reply"></textarea></form><article data-forum-content="post" data-content-id="11"><div class="v13-post-body">This is an evidence-based observation.</div></article></div>''')
 page.evaluate('''() => {
 window._calls=[]; window._pollMade=false;
 window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'TEST'}}})},rpc:async(name,args)=>{
   window._calls.push({name,args});
   if(name==='gu_forum_interaction_state')return {data:{subscribed:false,rating_count:0},error:null};
   if(name==='gu_forum_thanks_for_topic')return {data:[{kind:'post',id:11,count:3,mine:false}],error:null};
   if(name==='gu_forum_poll_get')return {data:{poll:window._pollMade?{question:'This is a poll question',options:[{id:55,label:'Agree',votes:1},{id:56,label:'Disagree',votes:0}],has_voted:false,closed:false,allow_multiple:false}:null,is_author:true},error:null};
   if(name==='gu_forum_poll_create'){window._pollMade=true;return {data:99,error:null}}
   if(name==='gu_forum_toggle_thanks')return {data:{active:true,count:4},error:null};
   if(name==='gu_forum_poll_vote')return {data:true,error:null};
   if(name==='gu_forum_rate_topic')return {data:{average:4.2,count:9},error:null};
   if(name==='gu_forum_toggle_subscription')return {data:true,error:null};
   return {data:null,error:{message:'Unknown test RPC'}};
 }});
 }''')
 page.add_script_tag(content=js)
 page.wait_for_timeout(180)
 assert page.get_by_role('heading',name='Discussion tools').count()==1
 assert page.get_by_role('button',name='Add a poll to your discussion').count()==1
 assert page.get_by_role('button',name='Thank (3)').count()==1
 page.get_by_role('button',name='Thank (3)').click();page.wait_for_timeout(100)
 assert page.get_by_role('button',name='Remove thanks (4)').count()==1
 page.get_by_role('button',name='Add a poll to your discussion').click()
 page.locator('input[name=question]').fill('This is a poll question')
 page.locator('textarea[name=options]').fill('Agree\nDisagree')
 page.get_by_role('button',name='Publish poll').click();page.wait_for_timeout(100)
 assert page.get_by_text('This is a poll question').count()==1
 assert page.get_by_role('button',name='Submit vote').count()==1
 page.locator('input[name=poll-option]').first.check()
 page.get_by_role('button',name='Submit vote').click();page.wait_for_timeout(60)
 assert page.evaluate('window._calls.some(x=>x.name===\'gu_forum_poll_vote\'&&x.args.p_option_ids[0]===55)')
 page.get_by_role('button',name='Quote',exact=True).click()
 assert '[quote]' in page.locator('#reply').input_value()
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 print('PASS mocked Supabase RPC: poll author creation and voting, thanks toggles, quoting, accessible 390px layout')
 browser.close()
