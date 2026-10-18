'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('create-account.html','utf8');
const dobSource=fs.readFileSync('assets/js/signup-dob.js','utf8');
const signupSource=fs.readFileSync('assets/js/signup.js','utf8');
const input={id:'signup-dob',value:'',selectionStart:0,selectionEnd:0,dataset:{},events:{},
  addEventListener(ev,fn){this.events[ev]=fn;},
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}};
const status={textContent:'',className:''};
const document={
 readyState:'complete',activeElement:input,
 getElementById:(id)=>id==='signup-dob'?input:id==='signup-dob-status'?status:null,
 addEventListener(){}};
const window={};
const ctx=vm.createContext({window,document,Date,Event:class Event {}});
vm.runInContext(dobSource,ctx);
const dob=window.SignupDOB;
assert.ok(dob&&dob.mask&&dob.normalize);
assert.equal(dob.mask('0'),'0');
assert.equal(dob.mask('07'),'07/');
assert.equal(dob.mask('0718'),'07/18/');
assert.equal(dob.mask('07181990'),'07/18/1990');
assert.equal(dob.mask('18/07/1990'),'18/07/1990');
assert.equal(dob.mask('18 July 1990'),'18/19/90');
assert.equal(dob.normalize('18/07/1990').value,'18/07/1990');
assert.equal(dob.normalize('07/18/1990').value,'18/07/1990');
assert.equal(dob.normalize('07/18/1990').converted,true);
assert.ok(dob.normalize('07/18/1990').message.includes('converted'));
assert.equal(dob.normalize('01/02/1990').value,'01/02/1990'); // Ambiguous order is never guessed
assert.equal(dob.normalize('29/02/2000').ok,true);
assert.equal(dob.normalize('29/02/2001').ok,false);
assert.equal(dob.normalize('31/04/1990').ok,false);
assert.equal(dob.normalize('31/13/1990').ok,false);
assert.equal(dob.normalize('29/02/2008',new Date('2026-02-28T12:00:00Z')).ok,false);
assert.equal(dob.normalize('29/02/2008',new Date('2026-03-01T12:00:00Z')).ok,true);
assert.equal(dob.normalize('18/10/2008',new Date('2026-10-18T15:00:00Z')).ok,true);
assert.equal(dob.normalize('19/10/2008',new Date('2026-10-18T15:00:00Z')).ok,false);
assert.equal(dob.normalize('18/10/2009').ok,false);
assert.equal(dob.normalize('01/01/2099').ok,false);
assert.equal(dob.normalize('07/18').ok,false);
input.value='0718';input.selectionStart=4;input.selectionEnd=4;
input.events.input();assert.equal(input.value,'07/18/');
input.value='07/18/1990';input.selectionStart=10;input.selectionEnd=10;
input.events.blur();assert.equal(input.value,'18/07/1990');
assert.ok(status.textContent.includes('converted'),'Unambiguous US date should be disclosed');
assert.ok(html.includes('assets/js/signup-dob.js'));
assert.ok(html.indexOf('signup-dob.js')<html.indexOf('assets/js/signup.js'));
assert.ok(html.includes('aria-describedby="signup-dob-status"'));
assert.ok(signupSource.includes('window.SignupDOB?.normalize'),'Submission must use validated DOB');
assert.ok(signupSource.includes('dobResult?.ok'),'DOB must be validated before CAPTCHA consumption');
assert.ok(signupSource.indexOf('if(!dobResult?.ok)')<signupSource.indexOf('window.GroundUpTurnstile?.getToken'),'DOB before CAPTCHA');
assert.ok(html.includes('class="required-star"'),'Required indicator must be stable');
assert.ok(!html.includes('Date of Birth (DD/MM/YYYY) *'),'Duplicate DOB asterisk must be removed');
console.log('PASS signup DOB: auto separators, US-order correction, strict calendar, 18+ gate, one-time CAPTCHA protected');
