'use strict';
const fs=require('fs');
const file=process.argv[2]||'_site/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(x,msg)=>{if(!s.includes(x))throw new Error(msg||('missing: '+x));};
for(const key of ['korean-daily-3000-state-v01','korean-daily-3000-settings-v01','korean-daily-3000-sync-v01'])must(key,'storage key missing '+key);
must('function modeFor(m){','modeFor missing');
must('id="frontWord"','frontWord missing');
must('id="saveSettingsBtn"','saveSettingsBtn missing');

// 1) Add question-format option to the existing settings panel without changing its storage namespace.
if(!s.includes('id="questionMode"')){
  const anchor='<div class="controls" style="justify-content:flex-start;margin-top:12px"><button id="saveSettingsBtn" class="btn primary">設定を保存</button></div>';
  must(anchor,'settings save anchor missing');
  const ui='<label for="questionMode">問題形式</label><select id="questionMode" style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px;font-size:16px;background:white"><option value="auto">自動（おすすめ）</option><option value="recognition">意味を想起のみ</option><option value="listening">聞き取りのみ</option><option value="production">口頭で韓国語のみ</option></select><div class="muted">自動では従来どおり、意味想起・聞き取り・口頭産出をローテーションします。選択した形式はこの端末とクラウド設定に保存されます。</div>';
  s=s.replace(anchor,ui+anchor);
}

// 2) Default setting remains backward-compatible: old saved settings are merged over this object.
s=s.replace(/let settings=\{newPerDay:15,retention:0\.90\};/, 'let settings={newPerDay:15,retention:0.90,questionMode:"auto"};');

// 3) Explicit choice overrides the rotation; auto preserves the original algorithm including recognition-first for new cards.
const oldMode='function modeFor(m){\n  if(!m.introduced || m.reps===0) return "recognition";\n  return ["listening","production","recognition"][m.modeIndex%3];\n}';
const newMode='function modeFor(m){\n  const forced=(settings&&settings.questionMode)||"auto";\n  if(["recognition","listening","production"].includes(forced)) return forced;\n  if(!m.introduced || m.reps===0) return "recognition";\n  return ["listening","production","recognition"][m.modeIndex%3];\n}';
if(s.includes(oldMode))s=s.replace(oldMode,newMode);
else if(!s.includes('const forced=(settings&&settings.questionMode)||"auto"'))throw new Error('modeFor patch anchor missing');

// 4) Make the listening face itself tappable/clickable to replay. Existing word-audio button remains intact.
const oldListening='else if(mode==="listening"){fw.textContent="🔊"; fp.textContent="音だけで単語と意味を思い出す"; setTimeout(()=>speak(card.word),250);}';
const newListening='else if(mode==="listening"){fw.textContent="🔊"; fw.setAttribute("role","button"); fw.setAttribute("tabindex","0"); fw.setAttribute("aria-label","もう一度聞く"); fw.style.cursor="pointer"; fp.textContent="音だけで単語と意味を思い出す（🔊をタップで再生）"; setTimeout(()=>speak(card.word),250);}';
if(s.includes(oldListening))s=s.replace(oldListening,newListening);
else if(!s.includes('aria-label","もう一度聞く'))throw new Error('listening render patch anchor missing');

const script=`\n// Daily5000 v1.7.0: listening replay + selectable question format\n(function(){\n  const fw=document.getElementById("frontWord");\n  function replayListening(){\n    if(!current||!current.card||modeFor(current.meta)!=="listening")return;\n    speak(current.card.word);\n  }\n  if(fw){\n    fw.addEventListener("click",replayListening);\n    fw.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&current&&modeFor(current.meta)==="listening"){e.preventDefault();replayListening();}});\n  }\n  const qm=document.getElementById("questionMode");\n  const syncQuestionModeUI=()=>{if(qm)qm.value=["auto","recognition","listening","production"].includes(settings.questionMode)?settings.questionMode:"auto";};\n  syncQuestionModeUI();\n  const saveBtn=document.getElementById("saveSettingsBtn");\n  if(saveBtn&&qm)saveBtn.addEventListener("click",()=>{settings.questionMode=qm.value||"auto";save();});\n  window.addEventListener("focus",syncQuestionModeUI);\n})();\n`;
if(!s.includes('Daily5000 v1.7.0: listening replay + selectable question format')){
  const end='</script>';
  const pos=s.lastIndexOf(end);if(pos<0)throw new Error('closing script missing');
  s=s.slice(0,pos)+script+s.slice(pos);
}

// Remove stale interactive attributes whenever a non-listening card is rendered.
const resetAnchor='const fw=document.getElementById("frontWord"), fp=document.getElementById("frontPrompt"), pw=document.getElementById("productionWrap");\n  pw.classList.add("hidden");';
if(s.includes(resetAnchor))s=s.replace(resetAnchor,'const fw=document.getElementById("frontWord"), fp=document.getElementById("frontPrompt"), pw=document.getElementById("productionWrap");\n  fw.removeAttribute("role"); fw.removeAttribute("tabindex"); fw.removeAttribute("aria-label"); fw.style.cursor="";\n  pw.classList.add("hidden");');

// Regression audit: learning data, cloud, core SRS and PACK initialization must remain intact.
for(const key of ['korean-daily-3000-state-v01','korean-daily-3000-settings-v01','korean-daily-3000-sync-v01'])if(!s.includes(key))throw new Error('storage regression '+key);
for(const marker of ['normalizeExampleToken','function initCloudSync(','function syncCloudCore(','function queueCloudSave(','id="startBtn"','id="showAnswerBtn"','id="knownBtn"','id="saveSettingsBtn"','id="questionMode"','aria-label","もう一度聞く','const forced=(settings&&settings.questionMode)||"auto"'])if(!s.includes(marker))throw new Error('core/feature regression '+marker);
const pp=s.search(/(?:const|let) PACK=/),rp=s.indexOf('const READY=new Map(PACK.filter');if(!(pp>=0&&rp>pp))throw new Error('PACK/READY order regression');
fs.writeFileSync(file,s);
console.log('Daily5000 v1.7.0 UI AUDIT OK: tap-to-replay listening; selectable modes; storage/cloud/SRS/PACK order preserved');
