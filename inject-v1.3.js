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
html=html.replaceAll('const APP_VERSION="1.2";','const APP_VERSION="1.3.2";');
html=html.replaceAll('const APP_VERSION="1.3";','const APP_VERSION="1.3.2";');
html=html.replaceAll('const APP_VERSION="1.3.1";','const APP_VERSION="1.3.2";');
html=html.replaceAll('FSRS · v1.2','FSRS · v1.3.2');
html=html.replaceAll('FSRS · v1.3.1','FSRS · v1.3.2');
html=html.replaceAll('FSRS · v1.3','FSRS · v1.3.2');
html=html.replaceAll('Web公開版 v1.2','Web公開版 v1.3.2');
html=html.replaceAll('Web公開版 v1.3.1','Web公開版 v1.3.2');
html=html.replaceAll('Web公開版 v1.3','Web公開版 v1.3.2');
html=html.replaceAll('教材化済み：Rank 1–500','教材化済み：Rank 1–600');
html=html.replaceAll('Rank 1–500（うちRank 40','Rank 1–600（うちRank 40');

// Use a classic script for the main bootstrap. Dynamic import() remains valid
// for optional FSRS/Supabase modules, while the core app initializes immediately.
if(!html.includes('<script type="module">'))throw new Error('main module script marker missing');
html=html.replace('<script type="module">','<script>');

// FSRS has a 5 second network timeout. Do not report a startup failure before
// that timeout has elapsed. Only report a real core-data failure when the
// app is still uninitialized AND the ready-card count is still zero.
const watchdog=`\n<script>\nsetTimeout(()=>{\n  const s=document.getElementById('engineStatus');\n  const r=document.getElementById('readyCount');\n  const ready=(r?.textContent||'').trim();\n  const coreFailed=/^0\\s*\\/\\s*3000$/.test(ready);\n  if(coreFailed && s && /準備中/.test(s.textContent||'')){\n    s.textContent='起動エラー · 再読み込みしてください';\n    s.style.color='#fecaca';\n    const msg=document.getElementById('dataMsg');\n    if(msg) msg.textContent='教材データの初期化に失敗しました。ページを再読み込みしてください。';\n  }\n},7000);\n</script>\n`;
html=html.replace('</body>',watchdog+'</body>');

if(!html.includes('"rank":600,"word":"어울리다"'))throw new Error('Rank 600 injection failed');
if(!html.includes('const APP_VERSION="1.3.2";'))throw new Error('version bump failed');
if(html.includes('<script type="module">'))throw new Error('module bootstrap conversion failed');
if(!html.includes('const STORAGE_KEY="korean-daily-3000-state-v01";'))throw new Error('learning-state storage key changed unexpectedly');
if(!html.includes('const SETTINGS_KEY="korean-daily-3000-settings-v01";'))throw new Error('settings storage key changed unexpectedly');
fs.writeFileSync(file,html);
console.log('AUDIT OK: Rank 501-600 = 100 cards; bootstrap classic-script; storage keys preserved; startup watchdog waits for FSRS timeout');
