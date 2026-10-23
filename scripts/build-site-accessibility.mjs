/* D17 source-only WCAG bypass block. Runs after static Pages assets are
 * copied. Creates one real keyboard skip link per page with a <main>.
 * Never modifies private lesson, assessment, or membership state.
 */
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const output=resolve(process.env.GU_SITE_BUILD_DIR||'public');
let changed=0,missingMain=[];
for(const filename of readdirSync(output).filter(p=>/^[a-z0-9-]+\.html$/.test(p))){
 const path=join(output,filename),original=readFileSync(path,'utf8');
 const match=/<main\b[^>]*>/i.exec(original);
 if(!match){missingMain.push(filename);continue;}
 let html=original;
 let main=match[0],id=/(?:\s)id=(["'])([^"']+)\1/i.exec(main)?.[2];
 if(!id){id='gu-main-content';main=main.replace(/<main\b/i,'<main id="gu-main-content"');html=html.replace(match[0],main)}
 if(!/class=(["'])[^"']*\bgu-skip-link\b/i.test(html)){
  html=html.replace(/<body\b[^>]*>/i,m=>m+'<a class="gu-skip-link" href="#'+id+'">Skip to main content</a>');
 }
 if(!html.includes('/assets/css/sitewide-accessibility-v014157.css')){
  html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/css/sitewide-accessibility-v014157.css"></head>');
 }
 if(html!==original){writeFileSync(path,html);changed++}
}
if(missingMain.length)console.warn('D17 pages needing manual landmark review: '+missingMain.join(', '));
console.log('D17 keyboard bypass installed across '+changed+' static Pages files; '+missingMain.length+' need landmark review.');
