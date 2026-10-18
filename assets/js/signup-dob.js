/* DOB entry: explicit day/month/year, automatic slashes, strict calendar/age checks.
 * An unambiguous US month/day/year value (e.g. 07/18/1990) is normalized visibly
 * to the existing DD/MM/YYYY contract. Ambiguous dates always follow the label.
 */
(()=>{'use strict';
function mask(raw){
  const digits=String(raw??'').replace(/\D/g,'').slice(0,8);
  if(digits.length<2)return digits;
  if(digits.length===2)return digits+'/';
  if(digits.length<4)return digits.slice(0,2)+'/'+digits.slice(2);
  if(digits.length===4)return digits.slice(0,2)+'/'+digits.slice(2,4)+'/';
  return digits.slice(0,2)+'/'+digits.slice(2,4)+'/'+digits.slice(4);
}
function normalize(raw,now=new Date()){
  const value=mask(raw).replace(/\/$/,'');
  const invalid={ok:false,message:'Enter a complete date as DD/MM/YYYY. For July 18, 1990, enter 18/07/1990.'};
  if(!/^\d{2}\/\d{2}\/\d{4}$/.test(value))return invalid;
  let [day,month,year]=value.split('/').map(Number);
  let converted=false;
  // A second component larger than 12 cannot be a month under DD/MM/YYYY.
  // Recognize only unambiguous MM/DD/YYYY. Do not guess on 01/02/1990.
  if(month>12&&month<=31&&day>=1&&day<=12){[day,month]=[month,day];converted=true;}
  const date=new Date(Date.UTC(year,month-1,day));
  if(year<100||year>9999||date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day){
    return {ok:false,message:'Enter a real calendar date in DD/MM/YYYY format. For July 18, 1990, enter 18/07/1990.'};
  }
  const age=now.getUTCFullYear()-year-(now.getUTCMonth()+1<month||(now.getUTCMonth()+1===month&&now.getUTCDate()<day)?1:0);
  if(age<18)return {ok:false,message:'You must be at least 18 years old to create an account.'};
  const formatted=[String(day).padStart(2,'0'),String(month).padStart(2,'0'),String(year).padStart(4,'0')].join('/');
  const message=converted?'Recognized MM/DD/YYYY and converted to '+formatted+' (DD/MM/YYYY). Verify the date is correct.':'';
  return {ok:true,value:formatted,converted,message};
}
function start(){
  const input=document.getElementById('signup-dob');
  if(!input||input.dataset.dobMaskReady)return;
  input.dataset.dobMaskReady='1';
  const message=document.getElementById('signup-dob-status');
  const status=(text,error=false)=>{if(!message)return;message.textContent=text||'';message.className='field-status small'+(error?' unavailable':'')};
  input.addEventListener('keydown',event=>{
    // Without this, Backspace at an automatically inserted slash re-inserts it.
    if(event.key!=='Backspace'||input.selectionStart!==input.selectionEnd)return;
    const pos=input.selectionStart;
    if(pos<2||input.value[pos-1]!=='/')return;
    event.preventDefault();
    input.value=mask(input.value.slice(0,pos-2)+input.value.slice(pos));
    const caret=Math.max(0,pos-2);
    input.setSelectionRange(caret,caret);
    status('');
  });
  input.addEventListener('input',()=>{
    const original=input.value,selection=input.selectionStart??original.length;
    const digitsLeft=original.slice(0,selection).replace(/\D/g,'').length;
    const atEnd=selection===original.length;
    const formatted=mask(original);
    if(formatted!==original)input.value=formatted;
    if(document.activeElement===input){
      let caret=formatted.length;
      if(!atEnd){
        caret=0;
        for(let i=0,count=0;i<formatted.length;i++){
          if(/\d/.test(formatted[i]))count++;
          if(count===digitsLeft){caret=i+1;break}
        }
      }
      input.setSelectionRange(caret,caret);
    }
    status('');
  });
  input.addEventListener('blur',()=>{
    if(!input.value)return status('');
    const result=normalize(input.value);
    if(result.ok){
      input.value=result.value;
      status(result.message);
    }else if(input.value.replace(/\D/g,'').length===8){
      status(result.message,true);
    }
  });
}
window.SignupDOB={mask,normalize};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
