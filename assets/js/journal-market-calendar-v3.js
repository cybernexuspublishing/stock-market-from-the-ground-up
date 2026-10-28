/* U.S. equities calendar for Trading Journal activity navigation.
 * Exchange: NYSE core equities, NOT crypto, futures, after-hours or global markets.
 * Official 2026–2028 dates: https://www.nyse.com/trade/hours-calendars
 * This calendar is navigation-only; does not delete or reject records on closed
 * dates, and early-close days remain selectable. Extraordinary exchange halts
 * and unscheduled national-day closures require a calendar update.
 */
(function(root){
'use strict';
const official={
 2026:{'2026-01-01':'New Year’s Day','2026-01-19':'Martin Luther King Jr. Day',
  '2026-02-16':'Washington’s Birthday','2026-04-03':'Good Friday','2026-05-25':'Memorial Day',
  '2026-06-19':'Juneteenth','2026-07-03':'Independence Day observed','2026-09-07':'Labor Day',
  '2026-11-26':'Thanksgiving','2026-12-25':'Christmas Day'},
 2027:{'2027-01-01':'New Year’s Day','2027-01-18':'Martin Luther King Jr. Day',
  '2027-02-15':'Washington’s Birthday','2027-03-26':'Good Friday','2027-05-31':'Memorial Day',
  '2027-06-18':'Juneteenth observed','2027-07-05':'Independence Day observed','2027-09-06':'Labor Day',
  '2027-11-25':'Thanksgiving','2027-12-24':'Christmas Day observed'},
 2028:{'2028-01-17':'Martin Luther King Jr. Day','2028-02-21':'Washington’s Birthday',
  '2028-04-14':'Good Friday','2028-05-29':'Memorial Day',
  '2028-06-19':'Juneteenth','2028-07-04':'Independence Day',
  '2028-09-04':'Labor Day','2028-11-23':'Thanksgiving','2028-12-25':'Christmas Day'}
};
const key=d=>d.toISOString().slice(0,10);
function nthMonday(year,month,n){
 const first=new Date(Date.UTC(year,month,1));
 return new Date(Date.UTC(year,month,1+((8-first.getUTCDay())%7)+(n-1)*7));
}
function lastMonday(year,month){
 const last=new Date(Date.UTC(year,month+1,0));
 return new Date(Date.UTC(year,month,last.getUTCDate()-((last.getUTCDay()+6)%7)));
}
function observed(year,month,day,allowFriday=true){
 const d=new Date(Date.UTC(year,month,day));
 // NYSE does NOT observe New Year's Day on a preceding Friday when it falls Saturday.
 if(d.getUTCDay()===0)d.setUTCDate(d.getUTCDate()+1);
 else if(d.getUTCDay()===6&&allowFriday)d.setUTCDate(d.getUTCDate()-1);
 return d;
}
function easter(year){
 // Anonymous Gregorian algorithm: used only to derive NYSE's Good Friday.
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),
 e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
 h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,
 l=(32+2*e+2*i-h-k+70)%7,m=Math.floor((a+11*h+22*l)/451),
 month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
 return new Date(Date.UTC(year,month-1,day));
}
function computed(year){
 const holidays=new Map();
 const set=(day,title)=>holidays.set(key(day),title);
 set(observed(year,0,1,false),'New Year’s Day');
 set(nthMonday(year,0,3),'Martin Luther King Jr. Day');
 set(nthMonday(year,1,3),'Washington’s Birthday');
 const gf=easter(year);gf.setUTCDate(gf.getUTCDate()-2);set(gf,'Good Friday');
 set(lastMonday(year,4),'Memorial Day');
 if(year>=2022)set(observed(year,5,19),'Juneteenth');
 set(observed(year,6,4),'Independence Day');
 set(nthMonday(year,8,1),'Labor Day');
 const thu=new Date(Date.UTC(year,10,1));thu.setUTCDate(1+((11-thu.getUTCDay())%7)+21);
 set(thu,'Thanksgiving');
 set(observed(year,11,25),'Christmas Day');
 return Object.fromEntries(holidays);
}
function closed(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return 'Invalid calendar date';
 const day=new Date(date+'T00:00:00Z');
 if(!Number.isFinite(day.valueOf())||key(day)!==date)return 'Invalid calendar date';
 if(day.getUTCDay()===0||day.getUTCDay()===6)return 'Weekend — NYSE closed';
 const year=day.getUTCFullYear();
 return (Object.prototype.hasOwnProperty.call(official,year)?official[year]:computed(year))[date]||null;
}
root.JournalMarketCalendar=Object.freeze({closed,officialYears:[2026,2027,2028],computed});
})(typeof window==='undefined'?globalThis:window);
