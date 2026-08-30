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

// Prevent PACK additions from executing before the base const PACK declaration.
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

// v1.3.3 added renderCardBreakdown(), which called normalizeExampleToken() but
// never defined it. That made the “答えを見る” button throw at runtime.
// Define a conservative normalizer before breakdown rendering.
const breakdownMarker='function renderCardBreakdown(card){';
if(!html.includes(breakdownMarker))throw new Error('renderCardBreakdown marker missing');
if(!html.includes('function normalizeExampleToken(')){
  html=html.replace(breakdownMarker,`function normalizeExampleToken(raw){\n  return String(raw||'').replace(/^[^0-9가-힣]+|[^0-9가-힣]+$/g,'');\n}\n\n${breakdownMarker}`);
}

for(const v of ['1.2','1.3','1.3.1','1.3.2','1.3.3']){
 html=html.replaceAll(`const APP_VERSION="${v}";`,'const APP_VERSION="1.3.4";');
 html=html.replaceAll(`FSRS · v${v}`,'FSRS · v1.3.4');
 html=html.replaceAll(`Web公開版 v${v}`,'Web公開版 v1.3.4');
}
html=html.replaceAll('教材化済み：Rank 1–500','教材化済み：Rank 1–600');
html=html.replaceAll('Rank 1–500（うちRank 40','Rank 1–600（うちRank 40');

if(html.includes('<script type="module">'))html=html.replace('<script type="module">','<script>');

// Runtime guard for all primary interactive controls. It does not replace the
// handlers; it only surfaces unexpected runtime errors in the UI instead of
// failing silently.
const runtimeGuard=`\n<script>\nwindow.addEventListener('error',e=>{\n  try{const msg=document.getElementById('dataMsg');if(msg)msg.textContent='操作エラー: '+(e.message||'不明なエラー');}catch(_){}\n});\nwindow.addEventListener('unhandledrejection',e=>{\n  try{const msg=document.getElementById('dataMsg');if(msg)msg.textContent='操作エラー: '+(e.reason?.message||e.reason||'不明なエラー');}catch(_){}\n});\nsetTimeout(()=>{\n  const s=document.getElementById('engineStatus');\n  const r=document.getElementById('readyCount');\n  const ready=(r?.textContent||'').trim();\n  if(/^0\\s*\\/\\s*3000$/.test(ready)){\n    if(s){s.textContent='起動エラー · 教材初期化失敗';s.style.color='#fecaca';}\n    const msg=document.getElementById('dataMsg');\n    if(msg)msg.textContent='教材データを読み込めませんでした。';\n  }\n},8000);\n</script>\n`;
html=html.replace('</body>',runtimeGuard+'</body>');

// Build-time button audit: every visible control must exist and be wired.
const requiredIds=['startBtn','showAnswerBtn','speakWordBtn','speakExampleBtn','knownBtn','rankSearch','rankLimit','saveSettingsBtn','exportBtn','importProgress','importPack'];
for(const id of requiredIds){
 if(!html.includes(`id="${id}"`))throw new Error(`button/control missing: ${id}`);
}
const requiredBindings=[
 'document.getElementById("startBtn").addEventListener',
 'document.getElementById("showAnswerBtn").addEventListener',
 'document.getElementById("speakWordBtn").addEventListener',
 'document.getElementById("speakExampleBtn").addEventListener',
 'document.getElementById("knownBtn").addEventListener',
 'document.querySelectorAll("[data-grade]").forEach',
 'document.getElementById("rankSearch").addEventListener',
 'document.getElementById("rankLimit").addEventListener',
 'document.getElementById("saveSettingsBtn").addEventListener',
 'document.getElementById("exportBtn").addEventListener',
 'document.getElementById("importProgress").addEventListener',
 'document.getElementById("importPack").addEventListener'
];
for(const sig of requiredBindings)if(!html.includes(sig))throw new Error(`handler missing: ${sig}`);

if(!html.includes('function normalizeExampleToken('))throw new Error('normalizeExampleToken fix missing');
if(!html.includes('"rank":600,"word":"어울리다"'))throw new Error('Rank 600 injection failed');
if(!html.includes('const APP_VERSION="1.3.4";'))throw new Error('version bump failed');
if(!html.includes('globalThis.__KOREAN_PENDING_PACKS'))throw new Error('pending pack fix missing');
if(!html.includes('const STORAGE_KEY="korean-daily-3000-state-v01";'))throw new Error('learning-state storage key changed unexpectedly');
if(!html.includes('const SETTINGS_KEY="korean-daily-3000-settings-v01";'))throw new Error('settings storage key changed unexpectedly');
fs.writeFileSync(file,html);
console.log('AUDIT OK: answer reveal fixed; all primary controls wired; PACK TDZ fixed; storage keys preserved; v1.3.4');
