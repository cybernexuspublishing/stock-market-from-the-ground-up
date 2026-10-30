/* SMFGU V2: consent-led return-to-learning calendar invitation.
 * User interaction only. A calendar file is created in memory and downloaded
 * locally; no server request, email, third-party feed or storage is involved.
 * The member chooses whether to import it into a calendar.
 */
(()=>{'use strict';
const button=document.getElementById('gu-v2-calendar-export');
const select=document.getElementById('gu-v2-calendar-delay');
const status=document.getElementById('gu-v2-calendar-status');
if(!button||!select||!status)return;
const ALLOWED=new Set(['1','3','7']);
const formatUtc=date=>{
 const p=x=>String(x).padStart(2,'0');
 return date.getUTCFullYear()+p(date.getUTCMonth()+1)+p(date.getUTCDate())+'T'+
  p(date.getUTCHours())+p(date.getUTCMinutes())+p(date.getUTCSeconds())+'Z';
};
const escapeCalendar=text=>String(text).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n')
  .replace(/,/g,'\\,').replace(/;/g,'\\;');
function createEvent(days,now=new Date()){
 if(!ALLOWED.has(String(days)))throw Error('Choose a valid study-day interval.');
 const start=new Date(now);
 start.setDate(start.getDate()+Number(days));
 start.setHours(18,0,0,0);
 const end=new Date(start.getTime()+25*60000);
 const uid='smfgu-free-foundations-'+formatUtc(start)+'@local.calendar';
 const title='Resume Free Foundations — practice and reflect';
 const description='Open your own dashboard and continue the next available lesson. Educational practice only; no trading signal or grade.';
 const lines=[
  'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Crown and Lantern Press//Free Foundations Study Calendar//EN',
  'CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
  'UID:'+uid,'DTSTAMP:'+formatUtc(now),'DTSTART:'+formatUtc(start),
  'DTEND:'+formatUtc(end),'SUMMARY:'+escapeCalendar(title),
  'DESCRIPTION:'+escapeCalendar(description),
  'URL:https://stock-market-from-the-ground-up-d1r.pages.dev/dashboard.html',
  'STATUS:CONFIRMED','TRANSP:OPAQUE','END:VEVENT','END:VCALENDAR',''
 ];
 return {text:lines.join('\r\n'),start};
}
button.addEventListener('click',()=>{
 const choice=String(select.value);
 if(!ALLOWED.has(choice)){status.textContent='Select 1, 3 or 7 days.';return;}
 try{
  const event=createEvent(choice),blob=new Blob([event.text],{type:'text/calendar;charset=utf-8'});
  const local=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=local;link.download='smfgu-free-foundations-study.ics';
  link.hidden=true;document.body.append(link);link.click();link.remove();
  // Cleanup is deferred, but no state or file is kept on the website.
  setTimeout(()=>URL.revokeObjectURL(local),1000);
  status.textContent='Calendar file prepared for '+event.start.toLocaleString(undefined,
   {weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+
   '. Import the file into your calendar if you choose. No reminder email was sent.';
 }catch{
  status.textContent='Calendar creation was blocked by the browser. Your progress is unchanged.';
 }
});
})();