const fs=require('fs');
const path=require('path');

function extractConstArray(source,name){
  const marker=`const ${name}=`;
  const start=source.indexOf(marker);
  if(start<0) throw new Error(`${name} not found`);
  const a=source.indexOf('[',start+marker.length);
  let depth=0,inStr=false,quote='',esc=false;
  for(let i=a;i<source.length;i++){
    const ch=source[i];
    if(inStr){if(esc){esc=false;continue;} if(ch==='\\'){esc=true;continue;} if(ch===quote)inStr=false;continue;}
    if(ch==='"'||ch==="'"){inStr=true;quote=ch;continue;}
    if(ch==='[')depth++; else if(ch===']'){depth--;if(depth===0)return source.slice(a,i+1);}
  }
  throw new Error(`${name} array end not found`);
}

function cleanToken(s){return String(s||'').replace(/^[\s“”‘’'"()\[\]{}<>〈〉《》「」『』【】]+|[\s.,!?;:…~·、。！？；：“”‘’'"()\[\]{}<>〈〉《》「」『』【】]+$/g,'');}

async function main(){
  const wrapperPath=process.argv[2]||'index.html';
  const basePath=process.argv[3]||'index-upload.html';
  const outPath=process.argv[4]||'_site/index.html';
  const exampleHelperPath=process.argv[5]||'example-content-v1.1.js';
  const exampleHelper=fs.readFileSync(exampleHelperPath,'utf8');
  const wrapper=fs.readFileSync(wrapperPath,'utf8');
  const baseSource=fs.readFileSync(basePath,'utf8');
  const extraCards=[
    ...require('./pack-201-300-v1.2.js'),
    ...require('./pack-301-400-v1.2.js'),
    ...require('./pack-401-500-v1.2.js')
  ];

  if(extraCards.length!==300) throw new Error(`expected 300 new cards, got ${extraCards.length}`);
  const ranks=extraCards.map(c=>c.rank);
  if(new Set(ranks).size!==300) throw new Error('duplicate rank in v1.2 cards');
  for(let r=201;r<=500;r++) if(!ranks.includes(r)) throw new Error(`missing Rank ${r}`);
  const seenExamples=new Map(), duplicateExamples=[];
  for(const c of extraCards){
    if(seenExamples.has(c.example)) duplicateExamples.push(`#${seenExamples.get(c.example)} & #${c.rank}: ${c.example}`);
    else seenExamples.set(c.example,c.rank);
  }
  if(duplicateExamples.length) throw new Error(`duplicate examples: ${duplicateExamples.join(' | ')}`);
  for(const c of extraCards){
    for(const k of ['word','meaning','example','example_jp','grammar_jp']) if(!String(c[k]||'').trim()) throw new Error(`Rank ${c.rank}: missing ${k}`);
    if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(JSON.stringify(c))) throw new Error(`Rank ${c.rank}: control character`);
  }
  const baseRank=JSON.parse(extractConstArray(baseSource,'RANK'));
  const rankMap=new Map(baseRank.map(x=>[Number(x.rank),x.word]));
  for(const c of extraCards) if(rankMap.get(c.rank)!==c.word) throw new Error(`Rank mismatch ${c.rank}: expected ${rankMap.get(c.rank)}, got ${c.word}`);

  const basePack=JSON.parse(extractConstArray(baseSource,'PACK'));
  const knownWords=new Set([...basePack,...extraCards].map(c=>c.word));
  let helperMaps={};
  try{helperMaps=new Function(`${exampleHelper}\nreturn {EXTRA_EXAMPLE_LEX,EXAMPLE_FORM_NOTES,EXAMPLE_FUNCTION_WORDS};`)();}catch(e){console.warn('helper audit maps unavailable',e.message);}
  const helperLex=new Set(Object.keys(helperMaps.EXTRA_EXAMPLE_LEX||{}));
  const helperForms=new Set(Object.keys(helperMaps.EXAMPLE_FORM_NOTES||{}));
  const helperFn=new Set(Object.keys(helperMaps.EXAMPLE_FUNCTION_WORDS||{}));
  const suffixes=['에게서','한테서','으로','에서','에게','한테','이랑','처럼','보다','까지','부터','하고','께서','은','는','이','가','을','를','에','도','만','와','과','랑','로','의'];
  function tokenExplained(token,card){
    const t=cleanToken(token); if(!t)return true;
    if(/^\d+$/.test(t))return true;
    if(card.form_notes&&card.form_notes[t])return true;
    if(helperForms.has(t)||helperFn.has(t)||helperLex.has(t)||knownWords.has(t))return true;
    for(const suf of suffixes){if(t.length>suf.length){const root=t.slice(0,-suf.length);if(knownWords.has(root)||helperLex.has(root)||helperFn.has(root))return true;}}
    return false;
  }
  const unresolved=[];
  for(const c of extraCards){for(const raw of String(c.example).split(/\s+/)){if(!tokenExplained(raw,c)) unresolved.push(`#${c.rank} ${raw}`);}}
  if(unresolved.length) throw new Error(`unexplained example tokens (${unresolved.length}): ${unresolved.slice(0,80).join(', ')}`);

  const m=wrapper.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('wrapper script not found');
  let captured='';
  global.fetch=async()=>({ok:true,status:200,text:async()=>baseSource});
  global.document={open(){},write(s){captured=String(s)},close(){},getElementById(){return {textContent:''}}};
  const p=eval(m[1]);
  if(p&&typeof p.then==='function') await p;
  if(!captured || !captured.includes('<!doctype html>')) throw new Error('wrapper did not generate HTML');
  let html=captured;

  const grammarMarker='const GRAMMAR=';
  if(!html.includes(grammarMarker)) throw new Error('GRAMMAR marker not found');
  html=html.replace(grammarMarker,`PACK.push(...${JSON.stringify(extraCards)});\n${grammarMarker}`);

  html=html.replace('const APP_VERSION="0.9";','const APP_VERSION="1.2";');
  html=html.replaceAll('Web公開版 v0.9','Web公開版 v1.2');

  const observerBlock=`const _completionObserver = new MutationObserver(()=>{\n  const text = document.body ? document.body.innerText : "";\n  if(/今日の.*完了/.test(text) && !extraUnlimitedMode && extraAllowance<=0){\n    showExtraStudyPanel();\n  }\n});\nif(document.body) _completionObserver.observe(document.body,{subtree:true,childList:true,characterData:true});`;
  html=html.replace(observerBlock,'');
  html=html.replace('updateStats(); return;\n  }\n  const rank=queue.shift()','updateStats(); setTimeout(()=>{try{if(typeof showExtraStudyPanel==="function")showExtraStudyPanel();}catch(e){}},0); return;\n  }\n  const rank=queue.shift()');
  html=html.replace('load();\nawait initCloudSync();','load();\nif(!state||typeof state!=="object")state={cards:{},reviews:[],daily:{}};\nif(!state.cards||typeof state.cards!=="object")state.cards={}; if(!Array.isArray(state.reviews))state.reviews=[]; if(!state.daily||typeof state.daily!=="object")state.daily={};\ninitCloudSync().catch(e=>{console.error("cloud init",e);try{cloudStatus("クラウド初期化エラー。ローカル学習は利用できます。","error")}catch(_){} });');
  html=html.replace('await initFSRS(); buildQueue(); updateStats(); renderRank();','buildQueue(); updateStats(); renderRank(); initFSRS().catch(e=>console.warn("FSRS init",e));');
  html=html.replace('FS=await import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm");','FS=await Promise.race([import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm"),new Promise((_,rej)=>setTimeout(()=>rej(new Error("FSRS load timeout")),5000))]);');
  html=html.replace('function todayKey(){return new Date().toISOString().slice(0,10)}','function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}');
  html=html.replace('document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>grade(b.dataset.grade)));','document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>{try{grade(b.dataset.grade)}catch(e){console.error("grade click",e)}finally{document.querySelectorAll("[data-grade]").forEach(x=>x.disabled=false)}}));');
  html=html.replace('document.getElementById("knownBtn").addEventListener("click",markKnown);','document.getElementById("knownBtn").addEventListener("click",()=>{try{markKnown()}catch(e){console.error("known click",e)}});');
  html=html.replace('document.getElementById("saveSettingsBtn").addEventListener("click",async()=>{settings.newPerDay=Math.max(0,Math.min(50,Number(document.getElementById("newPerDay").value)||15));settings.retention=Math.max(.8,Math.min(.97,Number(document.getElementById("retention").value)||.9));save();await initFSRS();buildQueue();document.getElementById("dataMsg").textContent="設定を保存しました。";});','document.getElementById("saveSettingsBtn").addEventListener("click",()=>{settings.newPerDay=Math.max(0,Math.min(50,Number(document.getElementById("newPerDay").value)||15));settings.retention=Math.max(.8,Math.min(.97,Number(document.getElementById("retention").value)||.9));save();buildQueue();document.getElementById("dataMsg").textContent="設定を保存しました。";initFSRS().catch(e=>console.warn("FSRS settings",e));});');

  html=html.replace('.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer}', '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer} button:disabled{opacity:.55;cursor:wait}');
  html=html.replace('日常会話Rank × 発音 × 想起テスト × FSRS</div>','日常会話Rank × 発音 × 想起テスト × FSRS · v1.2</div>');
  html=html.replace('教材化済み：Rank 1–200（意味・自然例文・文法ポイント・音声対象）','教材化済み：Rank 1–500（意味・自然例文・全単語解説・文法ポイント・音声対象）');
  html=html.replace('初期Rank 1–200（うち「한」は品詞確認待ち）','Rank 1–500（うちRank 40「한」は品詞確認待ち）');

  html=html.replace('<div class="jp" id="exampleJp"></div>','<div class="jp" id="exampleJp"></div><details class="breakdown" open><summary>例文の全単語解説</summary><div id="exampleBreakdown" class="breakdown-list"></div></details>');
  html=html.replace('button:disabled{opacity:.55;cursor:wait}','button:disabled{opacity:.55;cursor:wait} .breakdown{margin-top:14px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:10px 12px} .breakdown summary{font-weight:800;cursor:pointer}.breakdown-list{margin-top:8px;display:grid;gap:6px}.breakdown-row{display:grid;grid-template-columns:minmax(70px,120px) 1fr;gap:10px;align-items:start;font-size:14px;line-height:1.5}.breakdown-row b{font-size:15px}.grammar-title{font-weight:800;margin-bottom:5px}@media(max-width:520px){.breakdown-row{grid-template-columns:1fr;gap:1px}}');
  const localBreakdown=`\nfunction renderCardBreakdown(card){\n  const local=(card&&card.form_notes)||{};\n  return String(card&&card.example||'').trim().split(/\\s+/).filter(Boolean).map(raw=>{\n    const clean=normalizeExampleToken(raw);\n    const note=local[clean]||explainExampleToken(raw);\n    return '<div class="breakdown-row"><b>'+escapeHtml(raw)+'</b><span>'+escapeHtml(note)+'</span></div>';\n  }).join('');\n}\n`;
  html=html.replace('function reveal(){', exampleHelper+localBreakdown+'\nfunction reveal(){');
  html=html.replace('document.getElementById("exampleJp").textContent=c.example_jp||"";','document.getElementById("exampleJp").textContent=c.example_jp||""; document.getElementById("exampleBreakdown").innerHTML=renderCardBreakdown(c);');
  html=html.replace('document.getElementById("grammarText").innerHTML=(gs?`<b>文法:</b> ${gs}<br>`:"")+escapeHtml(c.grammar_jp||"")+(c.note?`<br><span class="muted">注意: ${escapeHtml(c.note)}</span>`:"");','const pg=primaryGrammar(c); document.getElementById("grammarText").innerHTML=`<div class="grammar-title">文法ワンポイント${pg?`：<span class="badge">${escapeHtml(pg)}</span>`:""}</div>`+escapeHtml(c.grammar_jp||"")+(gs?`<div class="muted" style="margin-top:6px">関連文法: ${gs}</div>`:"")+(c.note?`<br><span class="muted">注意: ${escapeHtml(c.note)}</span>`:"");');

  const forbidden=['_completionObserver','await initCloudSync();','await initFSRS(); buildQueue(); updateStats(); renderRank();'];
  for(const s of forbidden) if(html.includes(s)) throw new Error('forbidden legacy pattern remains: '+s);
  const required=['const APP_VERSION="1.2";','FSRS · v1.2','クラウド同期','data-grade="Easy"','例文の全単語解説','文法ワンポイント','"rank":500,"word":"대신"'];
  for(const s of required) if(!html.includes(s)) throw new Error('required pattern missing: '+s);

  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,html);
  console.log(`AUDIT OK: Rank 201-500 = ${extraCards.length} cards; unexplained tokens = 0; duplicate examples = 0`);
  console.log('Built',outPath,Buffer.byteLength(html),'bytes');
}
main().catch(e=>{console.error(e);process.exit(1)});
