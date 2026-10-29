/* D17 public SEO build: whitelist discovery pages only. Never make private
 * Admin/member pages indexable or call external providers. D18 must verify
 * the final canonical custom domain before enabling search indexing.
 */
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const output=resolve(process.env.GU_SITE_BUILD_DIR||'public');
const rawOrigin=process.env.GU_PUBLIC_SITE_ORIGIN||'https://stock-market-from-the-ground-up-d1r.pages.dev';
let origin;
try{
 const url=new URL(rawOrigin);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||
    url.search||url.hash||url.hostname.length>253||url.port)throw Error('Invalid canonical site origin');
 origin=url.origin;
}catch{throw Error('GU_PUBLIC_SITE_ORIGIN must be an HTTPS origin without path, query, credentials, or port');}
const candidates=[
 'index','about','books','store','learn','tools','lab-samples',
 'membership','help','faq','philosophy'
];
const description={
 help:'Get help with account access, books and stock-market learning tools.',
 tools:'Discover stock-market learning tools and practice resources.',
 membership:'Explore access to stock-market lessons, simulations and learning resources.',
 faq:'Frequently asked questions about the Ground Up stock-market learning platform.'
};
// Build must fail if the public opt-in controller is missing or cannot parse.
const ga4Controller=join(output,'assets/js/ga4-consent-v1.js');
if(!existsSync(ga4Controller))throw Error('GA4 consent controller missing from public assets');
execFileSync(process.execPath,['--check',ga4Controller],{stdio:'pipe'});
if(!readFileSync(ga4Controller,'utf8').includes('G-6BDZQGVPD2'))throw Error('GA4 measurement ID mismatch');
const indexable=new Set(),report={origin,pages:[],excluded:[],sourceOnly:true,productionAccepted:false};
for(const name of candidates){
 const file=join(output,name+'.html');if(!existsSync(file))continue;
 let html=readFileSync(file,'utf8');
 if(/<meta\s+[^>]*name=['"]robots['"][^>]*noindex/i.test(html)){
  report.excluded.push(name+'.html (existing noindex)');continue;
 }
 const path=name==='index'?'/':'/'+name+'.html';
 const canonical=origin+path;
 const canonicalTag='<link rel="canonical" href="'+canonical+'">';
 const canonicalPattern=/<link\s+[^>]*rel=['"]canonical['"][^>]*>/i;
 if(!/<\/head>/i.test(html))throw Error('Public page has no head: '+name);
 if(canonicalPattern.test(html))html=html.replace(canonicalPattern,canonicalTag);
 else html=html.replace(/<\/head>/i,canonicalTag+'</head>');
 if(!/<meta\s+[^>]*name=['"]description['"]/i.test(html)&&description[name]){
  html=html.replace(/<\/head>/i,'<meta name="description" content="'+description[name]+'"></head>');
 }
 // Load optional analytics only on verified public discovery pages.
 // The controller does not request Google code before visitor permission.
 const ga4Markup='<script defer src="/assets/js/ga4-consent-v1.js"></script>';
 if(!html.includes('ga4-consent-v1.js'))html=html.replace(/<\/head>/i,ga4Markup+'</head>');
 writeFileSync(file,html);
 indexable.add(path);
 report.pages.push({path,canonical});
}
for(const file of readdirSync(output).filter(x=>x.endsWith('.html'))){
 const slug=file.slice(0,-5);
 if(candidates.includes(slug)&&indexable.has(slug==='index'?'/':'/'+file))continue;
 const location=join(output,file);
 let html=readFileSync(location,'utf8');
 if(!/<meta\s+[^>]*name=['"]robots['"]/i.test(html)){
  if(!/<\/head>/i.test(html))throw Error('Nonpublic page has no head: '+file);
  html=html.replace(/<\/head>/i,'<meta name="robots" content="noindex,nofollow"></head>');
  writeFileSync(location,html);
 }
}
const xmlEntities=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 [...indexable].map(path=>'  <url><loc>'+xmlEntities(origin+path)+'</loc></url>').join('\n')+
 '\n</urlset>\n';
writeFileSync(join(output,'sitemap.xml'),sitemap);
writeFileSync(join(output,'robots.txt'),[
 'User-agent: *','Disallow: /api/','Disallow: /admin','Disallow: /dashboard',
 'Disallow: /account','Disallow: /my-purchases','Disallow: /my-library',
 'Disallow: /journal','Disallow: /simulator','Disallow: /market-tutor',
 'Disallow: /checkout','Disallow: /settings','Disallow: /owner-roadmap',
 'Disallow: /training-editor','Disallow: /lab-player',
 'Sitemap: '+origin+'/sitemap.xml',''].join('\n'));
console.log('D17 public SEO build: '+indexable.size+' whitelisted public routes; other HTML noindex; canonical domain needs D18 approval.');
