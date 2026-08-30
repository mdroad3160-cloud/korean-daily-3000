const fs=require('fs');
const path=require('path');

async function main(){
  const wrapperPath=process.argv[2]||'index.html';
  const basePath=process.argv[3]||'index-upload.html';
  const outPath=process.argv[4]||'_site/index.html';
  const exampleHelperPath=process.argv[5]||'example-content-v1.1.js';
  const exampleHelper=fs.readFileSync(exampleHelperPath,'utf8');
  const wrapper=fs.readFileSync(wrapperPath,'utf8');
  const m=wrapper.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('wrapper script not found');
  let captured='';
  global.fetch=async()=>({ok:true,status:200,text:async()=>fs.readFileSync(basePath,'utf8')});
  global.document={
    open(){},
    write(s){captured=String(s)},
    close(){},
    getElementById(){return {textContent:''}}
  };
  const p=eval(m[1]);
  if(p&&typeof p.then==='function') await p;
  if(!captured || !captured.includes('<!doctype html>')) throw new Error('wrapper did not generate HTML');
  let html=captured;

  // Version marker.
  html=html.replace('const APP_VERSION="0.9";','const APP_VERSION="1.1";');
  html=html.replaceAll('Web公開版 v0.9','Web公開版 v1.1');

  // Remove the completion MutationObserver. It mutated the DOM from inside its
  // own callback and could create an endless microtask loop on the final card.
  const observerBlock=`const _completionObserver = new MutationObserver(()=>{\n  const text = document.body ? document.body.innerText : "";\n  if(/今日の.*完了/.test(text) && !extraUnlimitedMode && extraAllowance<=0){\n    showExtraStudyPanel();\n  }\n});\nif(document.body) _completionObserver.observe(document.body,{subtree:true,childList:true,characterData:true});`;
  html=html.replace(observerBlock,'');

  // Empty-queue rendering itself shows the extra-study panel; no observer needed.
  html=html.replace(
    'updateStats(); return;\n  }\n  const rank=queue.shift()',
    'updateStats(); setTimeout(()=>{try{if(typeof showExtraStudyPanel==="function")showExtraStudyPanel();}catch(e){}},0); return;\n  }\n  const rank=queue.shift()'
  );

  // UI must render and bind before any network/CDN initialization finishes.
  html=html.replace(
    'load();\nawait initCloudSync();',
    'load();\nif(!state||typeof state!=="object")state={cards:{},reviews:[],daily:{}};\nif(!state.cards||typeof state.cards!=="object")state.cards={}; if(!Array.isArray(state.reviews))state.reviews=[]; if(!state.daily||typeof state.daily!=="object")state.daily={};\ninitCloudSync().catch(e=>{console.error("cloud init",e);try{cloudStatus("クラウド初期化エラー。ローカル学習は利用できます。","error")}catch(_){} });'
  );
  html=html.replace(
    'await initFSRS(); buildQueue(); updateStats(); renderRank();',
    'buildQueue(); updateStats(); renderRank(); initFSRS().catch(e=>console.warn("FSRS init",e));'
  );

  // CDN outage/latency falls back instead of blocking the app.
  html=html.replace(
    'FS=await import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm");',
    'FS=await Promise.race([import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm"),new Promise((_,rej)=>setTimeout(()=>rej(new Error("FSRS load timeout")),5000))]);'
  );

  // Daily quota follows the user's local calendar date, not UTC.
  html=html.replace(
    'function todayKey(){return new Date().toISOString().slice(0,10)}',
    'function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}'
  );

  // A grading exception must never leave every grade button disabled.
  html=html.replace(
    'document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>grade(b.dataset.grade)));',
    'document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>{try{grade(b.dataset.grade)}catch(e){console.error("grade click",e)}finally{document.querySelectorAll("[data-grade]").forEach(x=>x.disabled=false)}}));'
  );
  html=html.replace(
    'document.getElementById("knownBtn").addEventListener("click",markKnown);',
    'document.getElementById("knownBtn").addEventListener("click",()=>{try{markKnown()}catch(e){console.error("known click",e)}});'
  );

  // Settings save should not wait for CDN FSRS reinitialization.
  html=html.replace(
    'document.getElementById("saveSettingsBtn").addEventListener("click",async()=>{settings.newPerDay=Math.max(0,Math.min(50,Number(document.getElementById("newPerDay").value)||15));settings.retention=Math.max(.8,Math.min(.97,Number(document.getElementById("retention").value)||.9));save();await initFSRS();buildQueue();document.getElementById("dataMsg").textContent="設定を保存しました。";});',
    'document.getElementById("saveSettingsBtn").addEventListener("click",()=>{settings.newPerDay=Math.max(0,Math.min(50,Number(document.getElementById("newPerDay").value)||15));settings.retention=Math.max(.8,Math.min(.97,Number(document.getElementById("retention").value)||.9));save();buildQueue();document.getElementById("dataMsg").textContent="設定を保存しました。";initFSRS().catch(e=>console.warn("FSRS settings",e));});'
  );

  html=html.replace(
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer}',
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer} button:disabled{opacity:.55;cursor:wait}'
  );
  html=html.replace('日常会話Rank × 発音 × 想起テスト × FSRS</div>','日常会話Rank × 発音 × 想起テスト × FSRS · v1.1</div>');

  // Enrich every example with a complete word-by-word breakdown and one focused grammar point.
  html=html.replace(
    '<div class="jp" id="exampleJp"></div>',
    '<div class="jp" id="exampleJp"></div><details class="breakdown" open><summary>例文の全単語解説</summary><div id="exampleBreakdown" class="breakdown-list"></div></details>'
  );
  html=html.replace(
    'button:disabled{opacity:.55;cursor:wait}',
    'button:disabled{opacity:.55;cursor:wait} .breakdown{margin-top:14px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:10px 12px} .breakdown summary{font-weight:800;cursor:pointer}.breakdown-list{margin-top:8px;display:grid;gap:6px}.breakdown-row{display:grid;grid-template-columns:minmax(70px,120px) 1fr;gap:10px;align-items:start;font-size:14px;line-height:1.5}.breakdown-row b{font-size:15px}.grammar-title{font-weight:800;margin-bottom:5px}@media(max-width:520px){.breakdown-row{grid-template-columns:1fr;gap:1px}}'
  );
  html=html.replace('function reveal(){', exampleHelper+'\nfunction reveal(){');
  html=html.replace(
    'document.getElementById("exampleJp").textContent=c.example_jp||"";',
    'document.getElementById("exampleJp").textContent=c.example_jp||""; document.getElementById("exampleBreakdown").innerHTML=renderExampleBreakdown(c.example||"");'
  );
  html=html.replace(
    'document.getElementById("grammarText").innerHTML=(gs?`<b>文法:</b> ${gs}<br>`:"")+escapeHtml(c.grammar_jp||"")+(c.note?`<br><span class="muted">注意: ${escapeHtml(c.note)}</span>`:"");',
    'const pg=primaryGrammar(c); document.getElementById("grammarText").innerHTML=`<div class="grammar-title">文法ワンポイント${pg?`：<span class="badge">${escapeHtml(pg)}</span>`:""}</div>`+escapeHtml(c.grammar_jp||"")+(gs?`<div class="muted" style="margin-top:6px">関連文法: ${gs}</div>`:"")+(c.note?`<br><span class="muted">注意: ${escapeHtml(c.note)}</span>`:"");'
  );

  // Hard assertions: fail deployment instead of shipping a half-patched build.
  const forbidden=['_completionObserver','await initCloudSync();','await initFSRS(); buildQueue(); updateStats(); renderRank();'];
  for(const s of forbidden) if(html.includes(s)) throw new Error('forbidden legacy pattern remains: '+s);
  const required=['const APP_VERSION="1.1";','FSRS · v1.1','クラウド同期','data-grade="Easy"','例文の全単語解説','文法ワンポイント'];
  for(const s of required) if(!html.includes(s)) throw new Error('required pattern missing: '+s);

  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,html);
  console.log('Built',outPath,Buffer.byteLength(html),'bytes');
}
main().catch(e=>{console.error(e);process.exit(1)});
