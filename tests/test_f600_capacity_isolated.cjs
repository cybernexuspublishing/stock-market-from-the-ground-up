const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Pool}=require('pg');
const conf={host:'127.0.0.1',port:5432,user:'qa',password:'qa',database:'qa'};
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const key=n=>'f600-capacity-isolated-'+String(n).padStart(12,'0');
(async()=>{
 const base=new Pool({...conf,max:2});
 try{
  await base.query(fs.readFileSync('tests/fixtures/f600-capacity-isolated-v1.sql','utf8'));
  for(const concurrency of [16,32,64]){
   await base.query('TRUNCATE public.gu_founder_reservations_v014173');
   const pool=new Pool({...conf,max:concurrency,connectionTimeoutMillis:15000});
   try{
    const begin=Date.now();
    const result=await Promise.all(Array.from({length:640},(_,n)=>pool.query(
      "SELECT public.gu_founder_reserve_v014173($1::uuid,$2::text,$3::text,now()+interval '15 minutes') AS result",
      [id(n+1),n%2?'FOUNDING_60':'FOUNDING_30',key(n+1)])));
    const data=result.map(r=>r.rows[0].result);
    const successes=data.filter(r=>r.ok===true),overflow=data.filter(r=>r.error==='CAPACITY_EXHAUSTED');
    assert.equal(successes.length,600);assert.equal(overflow.length,40);
    assert.equal(new Set(successes.map(r=>r.seat)).size,600);
    assert.equal(Math.min(...successes.map(r=>r.seat)),1);
    assert.equal(Math.max(...successes.map(r=>r.seat)),600);
    const q=await base.query(
     "SELECT count(*)::int n,count(DISTINCT founder_number)::int seats,count(DISTINCT user_id)::int users,"+
     "count(*) FILTER(WHERE plan_code='FOUNDING_30')::int standard,count(*) FILTER(WHERE plan_code='FOUNDING_60')::int extended FROM public.gu_founder_reservations_v014173");
    assert.equal(q.rows[0].n,600);assert.equal(q.rows[0].seats,600);assert.equal(q.rows[0].users,600);
    assert.ok(q.rows[0].standard>0&&q.rows[0].extended>0);
    console.log('PASS',JSON.stringify({concurrency,attempts:640,assigned:600,overflow:40,
      ...q.rows[0],duration_ms:Date.now()-begin,environment:'isolated_postgres'}));
   }finally{await pool.end()}
  }
  await base.query("UPDATE public.gu_founder_reservations_v014173 SET expires_at=now()-interval '5 minutes' WHERE founder_number=1");
  await base.query("UPDATE public.gu_founder_reservations_v014173 SET expires_at=now()-interval '5 minutes',reservation_state='bound',checkout_session_id='cs_test_isolated_bound' WHERE founder_number=2");
  const reuse=await base.query("SELECT public.gu_founder_reserve_v014173($1::uuid,'FOUNDING_60',$2::text,now()+interval '15 minutes') AS result",[id(641),key(641)]);
  assert.equal(reuse.rows[0].result.ok,true);
  assert.equal(Number(reuse.rows[0].result.seat),1);
  const bound=await base.query("SELECT reservation_state FROM public.gu_founder_reservations_v014173 WHERE founder_number=2");
  assert.equal(bound.rows[0].reservation_state,'bound');
  const refused=await base.query("SELECT public.gu_founder_reserve_v014173($1::uuid,'FOUNDING_30',$2::text,now()+interval '15 minutes') AS result",[id(642),key(642)]);
  assert.equal(refused.rows[0].result.error,'CAPACITY_EXHAUSTED');
  console.log('PASS expired unbound seat reused, expired bound seat retained, capacity still 600');
 }finally{await base.end()}
})().catch(e=>{console.error(e);process.exitCode=1});
