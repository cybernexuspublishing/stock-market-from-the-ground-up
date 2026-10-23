/* D17 immutable Owner requirement traceability audit. Offline, no provider calls.
 * A status is not accepted without explicit evidence and an approval decision.
 * An unverified row is preserved, never auto-marked complete or superseded.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const input=readFileSync('docs/sitewide/REQUIREMENTS_REGISTER.csv','utf8');
function parseCsv(text){
 const records=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c==='"'&&text[i+1]==='"'){value+='"';i++}
   else if(c==='"')quoted=false;else value+=c;
  }else if(c==='"')quoted=true;
  else if(c===','){row.push(value);value=''}
  else if(c==='\r'||c==='\n'){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(value);value='';if(row.some(x=>x.trim()))records.push(row);row=[];
  }else value+=c;
 }
 if(quoted)throw Error('Unterminated requirement CSV quotation');
 if(row.length||value){row.push(value);records.push(row)}
 return records;
}
const rows=parseCsv(input);
const headers=rows.shift()||[];
const expected=['id','source','source_line','section','requirement','owner_requirement',
 'implementation_status','evidence','dependency','acceptance_test','decision'];
if(JSON.stringify(headers)!==JSON.stringify(expected))throw Error('Owner register schema changed');
const counts={},decisions={},errors=[],unverified=[],statusAccepted=new Set(['IMPLEMENTED','TESTED','ACCEPTED','BLOCKED','SUPERSEDED','UNVERIFIED']);
const ids=new Set();
for(const [i,row] of rows.entries()){
 if(row.length!==headers.length){errors.push('CSV column mismatch at row '+(i+2));continue}
 const item=Object.fromEntries(headers.map((key,j)=>[key,row[j].trim()]));
 if(!item.id||ids.has(item.id))errors.push('Duplicate/empty requirement identifier at row '+(i+2));
 ids.add(item.id);
 if(!statusAccepted.has(item.implementation_status))errors.push('Unknown implementation status for '+item.id);
 const s=item.implementation_status;
 counts[s]=(counts[s]||0)+1;
 decisions[item.decision||'MISSING']=(decisions[item.decision||'MISSING']||0)+1;
 if(s==='ACCEPTED'&&(!item.evidence||!item.acceptance_test||item.decision!=='APPROVED'))
  errors.push('Claimed accepted without acceptance evidence: '+item.id);
 if(s==='SUPERSEDED'&&(!item.decision||item.decision==='REVIEW'||!item.evidence))
  errors.push('Silent supersession without Owner decision: '+item.id);
 if(s==='TESTED'&&(!item.evidence||!item.acceptance_test))
  errors.push('Claimed tested without test evidence: '+item.id);
 if(s!=='ACCEPTED'&&s!=='SUPERSEDED')unverified.push({id:item.id,source:item.source,section:item.section,status:s});
}
if(rows.length<350)errors.push('Requirements register unexpectedly truncated');
const output={
 schema:'gu-d17-owner-requirement-reconciliation-v1',
 scope:'SOURCE_REGISTER_ONLY_NO_LIVE_ACCEPTANCE',
 sha256:createHash('sha256').update(input).digest('hex'),
 timestampUtc:new Date().toISOString(),registered:rows.length,
 byStatus:counts,byDecision:decisions,
 acceptedWithEvidence:counts.ACCEPTED||0,
 pendingReview:unverified.length,
 unverifiedRequirements:unverified,
 structuralErrors:errors.slice(0,250),
 requirementsFullyAccepted:unverified.length===0&&errors.length===0,
 productionCertified:false
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/d17-owner-requirements-reconciliation.json',JSON.stringify(output,null,2)+'\n');
console.log('D17 Owner register '+rows.length+' entries; '+unverified.length+' pending; '+errors.length+' contract errors. Production NOT CERTIFIED.');
for(const problem of errors.slice(0,20))console.error('REGISTER CONTRACT:',problem);
if(errors.length)process.exitCode=1;
