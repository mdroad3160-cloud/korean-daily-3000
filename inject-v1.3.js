const fs=require('fs');
const file=process.argv[2]||'_site/index.html';
let html=fs.readFileSync(file,'utf8');

const packs=[
 require('./pack-501-600-v1.3.js'),
 require('./pack-601-625-v1.4.js'),
 require('./pack-626-650-v1.4.js'),
 require('./pack-651-675-v1.4.js'),
 require('./pack-676-700-v1.4.js'),
 require('./pack-701-725-v1.4.1.js')
];
const cards=packs.flat();
if(cards.length!==225)throw new Error(`expected 225 cards, got ${cards.length}`);
const ranks=cards.map(c=>c.rank);
if(new Set(ranks).size!==225)throw new Error('duplicate Rank in v1.4.1');
for(let r=501;r<=725;r++)if(!ranks.includes(r))throw new Error(`missing Rank ${r}`);
const ex=new Set();
for(const c of cards){
 if(!c.word||!c.meaning||!c.example||!c.example_jp||!c.grammar_jp)throw new Error(`Rank ${c.rank}: missing required field`);
 if(ex.has(c.example))throw new Error(`duplicate example: ${c.example}`);
 ex.add(c.example);
}

// Strict audit for newly materialized cards: every surface token in the example
// must have an explicit lexical/morphological note, and grammar links must exist.
for(const c of cards.filter(c=>c.rank>=601)){
 if(!c.form_notes||typeof c.form_notes!=='object')throw new Error(`Rank ${c.rank}: form_notes missing`);
 const tokens=(String(c.example).match(/[0-9]+|[가-힣]+/g)||[]);
 for(const t of tokens)if(!c.form_notes[t])throw new Error(`Rank ${c.rank}: unexplained token ${t}`);
 if(!Array.isArray(c.grammar_ranks)||c.grammar_ranks.length===0)throw new Error(`Rank ${c.rank}: grammar_ranks missing`);
}

// Verify Rank-to-word mapping against the app's canonical Rank 1-3000 list.
const rankMatch=html.match(/const RANK=(\[[\s\S]*?\]);/);
if(!rankMatch)throw new Error('RANK data missing');
const rankRows=JSON.parse(rankMatch[1]);
const rankWord=new Map(rankRows.map(x=>[x.rank,x.word]));
for(const c of cards)if(rankWord.get(c.rank)!==c.word)throw new Error(`Rank ${c.rank}: word mismatch ${c.word} != ${rankWord.get(c.rank)}`);

// Verify links to existing grammar data before injecting anything.
const grammarMatch=html.match(/const GRAMMAR=(\[[\s\S]*?\]);/);
if(!grammarMatch)throw new Error('GRAMMAR data missing');
const grammarRows=JSON.parse(grammarMatch[1]);
const grammarRanks=new Set(grammarRows.map(g=>g.rank));
for(const c of cards.filter(c=>c.rank>=601)){
 for(const gr of c.grammar_ranks)if(!grammarRanks.has(gr))throw new Error(`Rank ${c.rank}: missing grammar link ${gr}`);
}

const marker='const GRAMMAR=';
if(!html.includes(marker))throw new Error('GRAMMAR marker missing');
// Never execute PACK.push here. Keep injected material in a pending buffer until
// after the base const PACK declaration has initialized. This prevents the TDZ
// startup failure that previously broke the app.
html=html.replace(marker,`globalThis.__KOREAN_PENDING_PACKS=(globalThis.__KOREAN_PENDING_PACKS||[]).concat(${JSON.stringify(cards)});\n${marker}`);

// Legacy build hooks may still have inserted PACK.push before const PACK.
// Convert those older insertions to the same pending buffer as a fail-safe.
const packDeclPos=html.indexOf('const PACK=');
if(packDeclPos<0)throw new Error('PACK declaration missing');
const beforePack=html.slice(0,packDeclPos).replaceAll(
  'PACK.push(...[',
  'globalThis.__KOREAN_PENDING_PACKS=(globalThis.__KOREAN_PENDING_PACKS||[]).concat(['
);
html=beforePack+html.slice(packDeclPos);
if(html.slice(0,html.indexOf('const PACK=')).includes('PACK.push('))throw new Error('unsafe PACK.push remains before PACK declaration');

const readyMarker='const READY=new Map(PACK.filter(x=>x.ready!==false).map(x=>[x.rank,x]));';
if(!html.includes(readyMarker))throw new Error('READY marker missing');
html=html.replace(readyMarker,`if(globalThis.__KOREAN_PENDING_PACKS?.length){PACK.push(...globalThis.__KOREAN_PENDING_PACKS);globalThis.__KOREAN_PENDING_PACKS=[];}\n${readyMarker}`);

// renderCardBreakdown() requires a conservative token normalizer.
const breakdownMarker='function renderCardBreakdown(card){';
if(!html.includes(breakdownMarker))throw new Error('renderCardBreakdown marker missing');
if(!html.includes('function normalizeExampleToken(')){
 html=html.replace(breakdownMarker,`function normalizeExampleToken(raw){\n  return String(raw||'').replace(/^[^0-9가-힣]+|[^0-9가-힣]+$/g,'');\n}\n\n${breakdownMarker}`);
}

for(const v of ['1.2','1.3','1.3.1','1.3.2','1.3.3','1.3.4','1.4.0']){
 html=html.replaceAll(`const APP_VERSION="${v}";`,'const APP_VERSION="1.4.1";');
 html=html.replaceAll(`FSRS · v${v}`,'FSRS · v1.4.1');
 html=html.replaceAll(`Web公開版 v${v}`,'Web公開版 v1.4.1');
}
html=html.replaceAll('教材化済み：Rank 1–500','教材化済み：Rank 1–725');
html=html.replaceAll('教材化済み：Rank 1–600','教材化済み：Rank 1–725');
html=html.replaceAll('教材化済み：Rank 1–700','教材化済み：Rank 1–725');
html=html.replaceAll('Rank 1–500（うちRank 40','Rank 1–725（うちRank 40');
html=html.replaceAll('Rank 1–600（うちRank 40','Rank 1–725（うちRank 40');
html=html.replaceAll('Rank 1–700（うちRank 40','Rank 1–725（うちRank 40');

if(html.includes('<script type="module">'))html=html.replace('<script type="module">','<script>');

// Runtime guard for all primary interactive controls. It does not replace the
// handlers; it only surfaces unexpected runtime errors in the UI.
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
if(!html.includes('"rank":725,"word":"여성"'))throw new Error('Rank 725 injection failed');
if(!html.includes('const APP_VERSION="1.4.1";'))throw new Error('version bump failed');
if(!html.includes('globalThis.__KOREAN_PENDING_PACKS'))throw new Error('pending pack fix missing');
if(html.slice(0,html.indexOf('const PACK=')).includes('PACK.push('))throw new Error('PACK TDZ regression detected');
if(!html.includes('const STORAGE_KEY="korean-daily-3000-state-v01";'))throw new Error('learning-state storage key changed unexpectedly');
if(!html.includes('const SETTINGS_KEY="korean-daily-3000-settings-v01";'))throw new Error('settings storage key changed unexpectedly');
fs.writeFileSync(file,html);
console.log('AUDIT OK: Rank 501-725 mapped; Rank 601-725 morphology+grammar audited; controls wired; PACK TDZ prevented; storage keys preserved; v1.4.1');
