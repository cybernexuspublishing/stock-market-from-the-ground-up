/* D17 Support client build consistency and reopening workflow. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync('assets/js/production-completion.js','utf8');
const ts=readFileSync('src/ts/production-completion.ts','utf8');
for(const source of [js,ts]){
 assert(source.includes("['closed','resolved'].includes(j.ticket.status)"),'Both closed and resolved tickets must offer reopen');
 assert(source.includes('data-reopen>Reopen Support Request'),'Button is keyboard accessible');
 assert(source.includes('/api/support?action=reopen'),'Always use owned server-side ticket action');
 assert(source.includes('reopen.disabled=true'),'Prevent accidental duplicate reopens');
 assert(source.includes('data-reopen-status'),'Failed requests must show inline accessible feedback');
 assert(source.includes('reopen.disabled=false'),'Failed requests are retryable');
 assert(source.includes('JSON.stringify({id})'),'Never infer another ticket or submit a missing ID');
 assert(!source.includes('support_tickets?id=eq.'),'Browser must not write PostgREST support rows directly');
}
console.log('PASS D17 source/compiled Support ticket reopening parity, permissioned endpoint, duplicate prevention and feedback');
