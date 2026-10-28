import {foundingOfferState} from '../_lib/founder-offer-gate-v1.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=0, must-revalidate','x-content-type-options':'nosniff'};
export async function onRequestGet({env}){
 try{const state=await foundingOfferState(env);return new Response(JSON.stringify({ok:true,...state}),{headers:H})}
 catch{return new Response(JSON.stringify({ok:false,offersVisible:false,enrollmentEnabled:false,phase:'unverified'}),{status:503,headers:{...H,'cache-control':'no-store'}})}
}