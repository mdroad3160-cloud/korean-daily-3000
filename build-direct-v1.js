const fs=require('fs');
const path=require('path');

async function main(){
  const wrapperPath=process.argv[2]||'index-v09.html';
  const basePath=process.argv[3]||'index-upload.html';
  const outPath=process.argv[4]||'_site/index.html';
  const wrapper=fs.readFileSync(wrapperPath,'utf8');
  const m=wrapper.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('wrapper script not found');
  let captured='';
  global.fetch=async()=>({ok:true,status:200,text:async()=>fs.readFileSync(basePath,'utf8')});
  global.document={open(){},write(s){captured=String(s)},close(){},getElementById(){return {textContent:''}}};
  const p=eval(m[1]);
  if(p&&typeof p.then==='function') await p;
  if(!captured||!captured.includes('<!doctype html>')) throw new Error('wrapper did not generate HTML');
  let html=captured;

  html=html.replace('const APP_VERSION="0.9";','const APP_VERSION="1.0";');
  html=html.replaceAll('Web公開版 v0.9','Web公開版 v1.0');

  const observerBlock=`const _completionObserver = new MutationObserver(()=>{\n  const text = document.body ? document.body.innerText : "";\n  if(/今日の.*完了/.test(text) && !extraUnlimitedMode && extraAllowance<=0){\n    showExtraStudyPanel();\n  }\n});\nif(document.body) _completionObserver.observe(document.body,{subtree:true,childList:true,characterData:true});`;
  html=html.replace(observerBlock,'');

  html=html.replace(
    'updateStats(); return;\n  }\n  const rank=queue.shift()',
    'updateStats(); setTimeout(()=>{try{if(typeof showExtraStudyPanel==="function")showExtraStudyPanel();}catch(e){}},0); return;\n  }\n  const rank=queue.shift()'
  );

  html=html.replace(
    'load();\nawait initCloudSync();',
    'load();\nif(!state||typeof state!=="object")state={cards:{},reviews:[],daily:{}};\nif(!state.cards||typeof state.cards!=="object")state.cards={}; if(!Array.isArray(state.reviews))state.reviews=[]; if(!state.daily||typeof state.daily!=="object")state.daily={};\ninitCloudSync().catch(e=>{console.error("cloud init",e);try{cloudStatus("クラウド初期化エラー。ローカル学習は利用できます。","error")}catch(_){} });'
  );
  html=html.replace(
    'await initFSRS(); buildQueue(); updateStats(); renderRank();',
    'buildQueue(); updateStats(); renderRank(); initFSRS().catch(e=>console.warn("FSRS init",e));'
  );

  html=html.replace(
    'FS=await import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm");',
    'FS=await Promise.race([import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm"),new Promise((_,rej)=>setTimeout(()=>rej(new Error("FSRS load timeout")),5000))]);'
  );

  html=html.replace(
    'function todayKey(){return new Date().toISOString().slice(0,10)}',
    'function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}'
  );

  html=html.replace(
    'document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>grade(b.dataset.grade)));',
    'document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>{try{grade(b.dataset.grade)}catch(e){console.error("grade click",e)}finally{document.querySelectorAll("[data-grade]").forEach(x=>x.disabled=false)}}));'
  );
  html=html.replace(
    'document.getElementById("knownBtn").addEventListener("click",markKnown);',
    'document.getElementById("knownBtn").addEventListener("click",()=>{try{markKnown()}catch(e){console.error("known click",e)}});'
  );

  html=html.replace(
    'document.getElementById("saveSettingsBtn").addEventListener("click",async()=>{settings.newPerDay=Math.max(0,Math.min(50,Number(document.getElementById("newPerDay").value)||15));settings.retention=Math.max(.8,Math.min(.97,Number(document.getElementById("retention").value)||.9));save();await initFSRS();buildQueue();document.getElementById("dataMsg").textContent="設定を保存しました。";});',
    'document.getElementById("saveSettingsBtn").addEventListener("click",()=>{settings.newPerDay=Math.max(0,Math.min(50,Number(document.getElementById("newPerDay").value)||15));settings.retention=Math.max(.8,Math.min(.97,Number(document.getElementById("retention").value)||.9));save();buildQueue();document.getElementById("dataMsg").textContent="設定を保存しました。";initFSRS().catch(e=>console.warn("FSRS settings",e));});'
  );

  html=html.replace(
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer}',
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer} button:disabled{opacity:.55;cursor:wait}'
  );
  html=html.replace('日常会話Rank × 発音 × 想起テスト × FSRS</div>','日常会話Rank × 発音 × 想起テスト × FSRS · v1.0</div>');

  const forbidden=['_completionObserver','await initCloudSync();','await initFSRS(); buildQueue(); updateStats(); renderRank();'];
  for(const s of forbidden) if(html.includes(s)) throw new Error('forbidden legacy pattern remains: '+s);
  const required=['const APP_VERSION="1.0";','FSRS · v1.0','クラウド同期','data-grade="Easy"'];
  for(const s of required) if(!html.includes(s)) throw new Error('required pattern missing: '+s);

  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,html);
  console.log('Built',outPath,Buffer.byteLength(html),'bytes');
}
main().catch(e=>{console.error(e);process.exit(1)});
