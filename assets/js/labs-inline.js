/* Learning Engine v3.3 — in-site member Lab host.
   Uses the existing protected Lab page; does not duplicate or weaken
   server entitlement checks, private grading, credit handling or replay.
   Same-origin frame is presentation-only. No private data crosses messages. */
(function(){
 'use strict';
 const VALID=/^[A-Za-z0-9_-]{3,90}$/;
 const ID='gu-inline-lab';
 const get=id=>document.getElementById(id);
 let frameObserver=null,activeId='',previousTrigger=null;
 function state(){return {host:get(ID),registry:get('gu-lab-registry-view'),frame:get('gu-inline-lab-frame'),close:get('gu-inline-lab-close'),link:get('gu-inline-lab-direct'),title:get('gu-inline-lab-title')}}
 function resize(){
  const {frame}=state();if(!frame||!activeId)return;
  try{
   const doc=frame.contentDocument;
   if(!doc)return;
   const inner=Math.max(doc.documentElement.scrollHeight,doc.body?.scrollHeight||0);
   if(Number.isFinite(inner)&&inner>0)frame.style.height=Math.max(650,Math.min(30000,Math.ceil(inner+14)))+'px';
  }catch{}
 }
 function attachHeightObserver(){
  frameObserver?.disconnect();frameObserver=null;
  const {frame}=state();try{
   const doc=frame.contentDocument;
   if(!doc?.documentElement)return;
   const ro=new ResizeObserver(resize);
   ro.observe(doc.documentElement);if(doc.body)ro.observe(doc.body);
   frameObserver=ro;resize();
  }catch{}
 }
 function showLab(id,{push=false,trigger=null}={}){
  const {host,registry,frame,link,title}=state();
  if(!VALID.test(String(id))||!host||!registry||!frame)return false;
  previousTrigger=trigger||previousTrigger;
  activeId=id;
  const lab=encodeURIComponent(id),src='lab-player.html?lab='+lab+'&embedded=1';
  const name=document.querySelector('#row-'+CSS.escape(id)+' .lab-concept')?.textContent?.trim()||'Interactive Lab';
  title.textContent=name+' · '+id;
  link.href='lab-player.html?lab='+lab;
  registry.hidden=true;host.hidden=false;
  if(frame.getAttribute('src')!==src){frameObserver?.disconnect();frame.style.height='780px';frame.setAttribute('src',src)}
  if(push){
   const u=new URL(location.href);u.searchParams.set('open',id);
   history.pushState({guInlineLab:id},'',u.pathname+u.search+u.hash);
  }
  document.body.classList.add('gu-inline-lab-active');
  title.focus({preventScroll:true});
  host.scrollIntoView({behavior:'auto',block:'start'});
  return true;
 }
 function hideLab({historyUpdate=true}={}){
  const {host,registry,frame}=state();if(!host||!registry)return;
  frameObserver?.disconnect();frameObserver=null;activeId='';
  host.hidden=true;registry.hidden=false;document.body.classList.remove('gu-inline-lab-active');
  // Clear remote Lab content from the frame on close; never persist its
  // sensitive decision form or reveal state in a hidden background iframe.
  frame?.removeAttribute('src');
  if(frame)frame.style.height='780px';
  if(historyUpdate){
   const u=new URL(location.href);u.searchParams.delete('open');
   history.replaceState(null,'',u.pathname+u.search+u.hash);
  }
  if(previousTrigger?.isConnected)previousTrigger.focus({preventScroll:true});
  else get('q')?.focus({preventScroll:true});
 }
 function init(){
  const {host,close,frame}=state();if(!host||!frame||!close)return;
  document.addEventListener('click',event=>{
   const anchor=event.target.closest?.('a.lab-open-btn[href*="lab-player"]');
   if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const dest=new URL(anchor.href,location.href),id=dest.searchParams.get('lab');
   if(dest.origin!==location.origin||!id||!VALID.test(id))return;
   event.preventDefault();showLab(id,{push:true,trigger:anchor});
  });
  close.addEventListener('click',()=>hideLab());
  frame.addEventListener('load',attachHeightObserver);
  addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
   if(event.data?.type==='groundup:close-inline-lab')hideLab();
   if(event.data?.type==='groundup:resize-inline-lab')resize();
  });
  addEventListener('popstate',()=>{
   const id=new URLSearchParams(location.search).get('open');
   if(id&&VALID.test(id))showLab(id);
   else if(activeId)hideLab({historyUpdate:false});
  });
  const direct=new URLSearchParams(location.search).get('open');
  if(direct&&VALID.test(direct))showLab(direct);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
