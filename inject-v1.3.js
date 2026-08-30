const fs=require('fs');
const file=process.argv[2]||'_site/index.html';
let html=fs.readFileSync(file,'utf8');
const cards=require('./pack-501-600-v1.3.js');
if(cards.length!==100)throw new Error(`expected 100 cards, got ${cards.length}`);
const ranks=cards.map(c=>c.rank);
if(new Set(ranks).size!==100)throw new Error('duplicate Rank in v1.3');
for(let r=501;r<=600;r++)if(!ranks.includes(r))throw new Error(`missing Rank ${r}`);
const ex=new Set();
for(const c of cards){
 if(!c.word||!c.meaning||!c.example||!c.example_jp||!c.grammar_jp)throw new Error(`Rank ${c.rank}: missing required field`);
 if(ex.has(c.example))throw new Error(`duplicate example: ${c.example}`); ex.add(c.example);
}
const marker='const GRAMMAR=';
if(!html.includes(marker))throw new Error('GRAMMAR marker missing');
html=html.replace(marker,`PACK.push(...${JSON.stringify(cards)});\n${marker}`);

// The build hook historically injected PACK.push(...) calls before the base
// `const PACK=[...]` declaration. That is a temporal-dead-zone runtime error:
// "Cannot access 'PACK' before initialization", which prevented all app setup.
// Queue every pre-declaration pack addition on globalThis instead, then merge
// them immediately before READY is constructed (after PACK is initialized).
const packDeclPos=html.indexOf('const PACK=');
if(packDeclPos<0)throw new Error('PACK declaration missing');
const beforePack=html.slice(0,packDeclPos).replaceAll(
  'PACK.push(...[',
  'globalThis.__KOREAN_PENDING_PACKS=(globalThis.__KOREAN_PENDING_PACKS||[]).concat(['
);
html=beforePack+html.slice(packDeclPos);
const readyMarker='const READY=new Map(PACK.filter(x=>x.ready!==false).map(x=>[x.rank,x]));';
if(!html.includes(readyMarker))throw new Error('READY marker missing');
html=html.replace(readyMarker,`if(globalThis.__KOREAN_PENDING_PACKS?.length){PACK.push(...globalThis.__KOREAN_PENDING_PACKS);globalThis.__KOREAN_PENDING_PACKS=[];}\n${readyMarker}`);

for(const v of ['1.2','1.3','1.3.1','1.3.2']){
 html=html.replaceAll(`const APP_VERSION="${v}";`,'const APP_VERSION="1.3.3";');
 html=html.replaceAll(`FSRS · v${v}`,'FSRS · v1.3.3');
 html=html.replaceAll(`Web公開版 v${v}`,'Web公開版 v1.3.3');
}
html=html.replaceAll('教材化済み：Rank 1–500','教材化済み：Rank 1–600');
html=html.replaceAll('Rank 1–500（うちRank 40','Rank 1–600（うちRank 40');

// Keep the current bootstrap form and add a late diagnostic only for a true
// core-data failure. FSRS/network failures themselves must not stop learning.
if(html.includes('<script type="module">'))html=html.replace('<script type="module">','<script>');
const watchdog=`\n<script>\nsetTimeout(()=>{\n  const s=document.getElementById('engineStatus');\n  const r=document.getElementById('readyCount');\n  const ready=(r?.textContent||'').trim();\n  if(/^0\\s*\\/\\s*3000$/.test(ready)){\n    if(s){s.textContent='起動エラー · 教材初期化失敗';s.style.color='#fecaca';}\n    const msg=document.getElementById('dataMsg');\n    if(msg)msg.textContent='教材データを読み込めませんでした。';\n  }\n},8000);\n</script>\n`;
html=html.replace('</body>',watchdog+'</body>');

if(!html.includes('"rank":600,"word":"어울리다"'))throw new Error('Rank 600 injection failed');
if(!html.includes('const APP_VERSION="1.3.3";'))throw new Error('version bump failed');
if(!html.includes('globalThis.__KOREAN_PENDING_PACKS'))throw new Error('pending pack fix missing');
if(!html.includes('const STORAGE_KEY="korean-daily-3000-state-v01";'))throw new Error('learning-state storage key changed unexpectedly');
if(!html.includes('const SETTINGS_KEY="korean-daily-3000-settings-v01";'))throw new Error('settings storage key changed unexpectedly');
fs.writeFileSync(file,html);
console.log('AUDIT OK: Rank 501-600 = 100 cards; PACK TDZ fixed; storage keys preserved; v1.3.3');
