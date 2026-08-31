'use strict';
const fs=require('fs');
const START=3001,END=3100,VERSION='1.5.0';
const file=process.argv[2]||'_site/index.html';
let src=fs.readFileSync(file,'utf8');
const candidates=require('./pack-3001-3100-v1.5.0.js');
if(!Array.isArray(candidates)||candidates.length<100)throw new Error('candidate pack must contain at least 100 entries');
function parseArray(name){const m=src.match(new RegExp(`(?:const|let)\\s+${name}=(\\[.*?\\]);`,'s'));if(!m)throw new Error(`${name} missing`);return {json:m[1],data:JSON.parse(m[1]),match:m[0]};}
const R=parseArray('RANK'),P=parseArray('PACK'),GR=parseArray('GRAMMAR');
const norm=s=>String(s||'').replace(/[-\s]/g,'').trim();
const existingWords=new Set(R.data.map(x=>norm(x.word)));
const selected=[];
for(const row of candidates){if(!Array.isArray(row)||row.length<5)throw new Error('bad candidate row');const [word,meaning,example,jp,note]=row;if(!word||!meaning||!example||!jp||!note)throw new Error(`missing candidate field: ${word}`);if(existingWords.has(norm(word)))continue;if(selected.some(x=>norm(x[0])===norm(word)))continue;selected.push(row);if(selected.length===100)break;}
if(selected.length!==100)throw new Error(`only ${selected.length} nonduplicate candidates available`);
const newRanks=selected.map((row,i)=>({rank:START+i,word:row[0],confidence:'中（Daily5000拡張）',orig:3038+i}));
for(let i=0;i<100;i++)if(newRanks[i].rank!==START+i)throw new Error('rank continuity failure');
const allRankWords=[...R.data,...newRanks].map(x=>norm(x.word));if(new Set(allRankWords).size!==allRankWords.length)throw new Error('duplicate headword across extended RANK');
src=src.replace(R.match,`const RANK=${JSON.stringify([...R.data,...newRanks])};`);
const grammarByRank=new Map(GR.data.map(g=>[Number(g.rank),g]));
const meaningMap=new Map();
for(const c of P.data)if(c&&c.word&&c.meaning)meaningMap.set(norm(c.word),String(c.meaning));
for(const m of src.matchAll(/"word"\s*:\s*"([^"]+)"[\s\S]{0,220}?"meaning"\s*:\s*"([^"]+)"/g))meaningMap.set(norm(m[1]),m[2]);
for(const row of selected)meaningMap.set(norm(row[0]),row[1]);
const clean=t=>String(t||'').replace(/^[“”‘’'"()\[\]{}]+|[.,!?。！？;:…~“”‘’'"()\[\]{}]+$/g,'').trim();
const particles=[['에서는','에서＋는（場所＋主題）'],['에게는','에게＋는（対象＋主題）'],['으로','으로/로（手段・方向）'],['에서','에서（場所・起点）'],['에게','에게（人への対象）'],['까지','까지（〜まで）'],['부터','부터（〜から）'],['보다','보다（比較「〜より」）'],['처럼','처럼（〜のように）'],['하고','하고（〜と／〜して）'],['으로','으로/로'],['로','으로/로'],['랑','이랑/랑（〜と）'],['이랑','이랑/랑（〜と）'],['은','은/는（主題）'],['는','은/는（主題・連体）'],['이','이/가（主格）'],['가','이/가（主格）'],['을','을/를（目的格）'],['를','을/를（目的格）'],['에','에（場所・時・到達点）'],['도','도（〜も）'],['만','만（〜だけ）'],['의','의（〜の）']];
const common={
'오늘은':'오늘「今日」＋은/는','주말에':'주말「週末」＋에','지금':'지금「今」','정말':'정말「本当に」','조금':'조금「少し」','갑자기':'갑자기「急に」','미리':'미리「前もって」','먼저':'먼저「先に」','매일':'매일「毎日」','내일':'내일「明日」','어제':'어제「昨日」','요즘':'요즘「最近」','여기':'여기「ここ」','근처에':'근처「近所」＋에','친구가':'친구「友達」＋이/가','친구를':'친구「友達」＋을/를','회사에서':'회사「会社」＋에서','집에서':'집「家」＋에서','병원에서':'병원「病院」＋에서','온라인에서':'온라인「オンライン」＋에서','카드로':'카드「カード」＋으로/로','두':'두「二つの」','한':'한「一つの」','삼십':'삼십「30」','분':'분「分」','시':'시「時」','다':'다「全部」','더':'더「もっと」','좀':'좀「少し／依頼を柔らげる」','안':'안「〜ない」','왜':'왜「なぜ」','뭐':'뭐「何」','같은':'같다「同じだ」の連体形','새':'새「新しい」','다른':'다르다「違う」の連体形','큰':'크다「大きい」の連体形','작은':'작다「小さい」の連体形','좋아하는':'좋아하다「好きだ」の現在連体形','편한':'편하다「楽だ」の連体形','밀린':'밀리다「たまる・遅れる」の連体形','야생':'야생「野生」','외국인':'외국인「外国人」','고객의':'고객「顧客」＋의','전':'전「全・すべての」'};
function explainToken(raw){const t=clean(raw),n=norm(t);if(!t)return '';if(/^\d+$/.test(t))return `${t}：数字`;if(common[t])return common[t];if(meaningMap.has(n))return `${t}：${meaningMap.get(n)}`;
for(const [p,desc] of particles){if(t.endsWith(p)&&t.length>p.length){const base=t.slice(0,-p.length),bn=norm(base);if(meaningMap.has(bn))return `${base}「${meaningMap.get(bn)}」＋${desc}`;if(common[base])return `${common[base]}＋${desc}`;}}
const endings=[['했어요','하다 の過去丁寧形 -했어요'],['했어요','過去丁寧形'],['았어요','過去丁寧形 -았어요'],['었어요','過去丁寧形 -었어요'],['하고 있어요','進行形 -고 있어요'],['고 있어요','進行形 -고 있어요'],['할 거예요','未来・予定 -(으)ㄹ 거예요'],['할게요','意思 -(으)ㄹ게요'],['해 주세요','依頼 -아/어 주세요'],['세요','尊敬・丁寧 -(으)세요'],['해요','現在丁寧形'],['아요','現在丁寧形 -아요'],['어요','現在丁寧形 -어요'],['해서','理由・順序 -아/어서'],['아서','理由・順序 -아/어서'],['어서','理由・順序 -아/어서'],['해도','譲歩・許可 -아/어도'],['고','接続 -고'],['는','現在連体形 -는'],['은','連体形 -(으)ㄴ'],['한','하다系の連体形 -(으)ㄴ'],['게','副詞化 -게']];
for(const [e,desc] of endings){if(t.endsWith(e)){const stem=t.slice(0,-e.length);for(const [w,m] of meaningMap){const ws=w.endsWith('하다')?w.slice(0,-2):w.endsWith('다')?w.slice(0,-1):w;if(ws.length>=2&&(norm(stem).startsWith(ws)||n.startsWith(ws)))return `${w}「${m}」の活用形（${desc}）`;}}}
return `${t}：例文で「${t}」として使う語。文全体の日本語訳と対応して意味・機能を確認`;
}
function grammarFor(example){const out=[];if(/[았었했]어요|됐어요|왔어요|갔어요|봤어요|났어요/.test(example))out.push(4);if(/고 있어요/.test(example))out.push(35);if(/할 거예요|ㄹ 거예요|을 거예요/.test(example))out.push(50);if(/해도 돼요|아도 돼요|어도 돼요/.test(example))out.push(120);if(/주세요| 주세요/.test(example))out.push(33);if(/해서|아서|어서/.test(example))out.push(23);if(/에 /.test(example)||/에\s/.test(example))out.push(11);if(/에서/.test(example))out.push(24);if(/보다/.test(example))out.push(80);if(/위해/.test(example))out.push(85);if(/고 싶어요/.test(example))out.push(69);if(/지 마세요/.test(example))out.push(94);if(/수 있어요/.test(example))out.push(31);if(/요[.?！]?$/u.test(example))out.push(9);if(!out.length)out.push(9);return [...new Set(out)].filter(x=>grammarByRank.has(x));}
const priorExamples=new Set([...src.matchAll(/"example"\s*:\s*"([^"]+)"/g)].map(m=>m[1]));
const cards=selected.map((row,i)=>{const rank=START+i,[word,meaning,example,jp,note]=row;if(priorExamples.has(example))throw new Error(`duplicate example @${rank}`);priorExamples.add(example);const gr=grammarFor(example);if(!gr.length)throw new Error(`grammar missing @${rank}`);const tokens=String(example).split(/\s+/).map(clean).filter(Boolean);const form_notes={};for(const t of tokens)form_notes[t]=explainToken(t);if(Object.keys(form_notes).length!==new Set(tokens).size)throw new Error(`token note mismatch @${rank}`);const links=gr.map(r=>{const g=grammarByRank.get(r)||{};return {rank:r,pattern:g.name||g.pattern||'',jp:g.definition||g.jp||''};});return {rank,word,meaning,example,example_jp:jp,register:'丁寧・日常会話中心',grammar:links.map(x=>x.pattern).filter(Boolean),grammar_ranks:gr,grammar_links:links,grammar_jp:`文法ワンポイント：${links.map(x=>`Rank ${x.rank} ${x.pattern}「${x.jp}」`).join('／')}／例文内の全語・活用形は下記 form_notes で確認`,form_notes,word_notes:note,tts:example,tts_text:example,ready:true};});
if(cards.length!==100||cards[0].rank!==3001||cards.at(-1).rank!==3100)throw new Error('card range failure');
if(new Set(cards.map(x=>norm(x.word))).size!==100)throw new Error('duplicate new headword');
const readyToken='const READY=new Map(PACK.filter';const readyPos=src.indexOf(readyToken);if(readyPos<0)throw new Error('READY initialization missing');
const packPos=Math.max(src.lastIndexOf('const PACK=',readyPos),src.lastIndexOf('let PACK=',readyPos));if(packPos<0||packPos>=readyPos)throw new Error('PACK init order missing');
for(let r=START;r<=END;r++)if(new RegExp(`"rank"\\s*:\\s*${r}(?=[,}])`).test(src.slice(packPos,readyPos)))throw new Error(`Rank already materialized ${r}`);
src=src.slice(0,readyPos)+`PACK.push(...${JSON.stringify(cards)});\n`+src.slice(readyPos);
src=src.replace(/const APP_VERSION="1\.4\.29";/,`const APP_VERSION="${VERSION}";`);if(!src.includes(`const APP_VERSION="${VERSION}";`))throw new Error('APP_VERSION update failed');
// Daily 5000 shell labels, while preserving legacy storage namespace and URL.
src=src.replaceAll('韓国語 Daily 3000','韓国語 Daily 5000').replaceAll('韓国語3000','韓国語5000').replaceAll('3000語Rank','5000語Rank').replaceAll(' / 3000`',' / 5000`').replaceAll(' / 3000<',' / 5000<');
src=src.replace(/教材化済み：Rank 1–3000/g,'教材化済み：Rank 1–3100');
src=src.replace(/FSRS · v1\.4\.29/g,'FSRS · v1.5.0').replace(/Web公開版 v1\.4\.29/g,'Web公開版 v1.5.0');
const critical=['id="startBtn"','id="showAnswerBtn"','id="knownBtn"','id="saveSettingsBtn"','id="cloudSyncNowBtn"','id="exportBtn"','id="importProgress"','document.getElementById("startBtn").addEventListener("click"','document.getElementById("showAnswerBtn").addEventListener("click"','document.getElementById("knownBtn").addEventListener("click"','document.getElementById("saveSettingsBtn").addEventListener("click"','syncBtn.addEventListener("click",()=>syncCloudCore(true))','document.getElementById("exportBtn").addEventListener("click"','document.getElementById("importProgress").addEventListener("change"','korean-daily-3000-state-v01','korean-daily-3000-settings-v01','korean-daily-3000-sync-v01','function initCloudSync(','function syncCloudCore(','function queueCloudSave(','const READY=new Map(PACK.filter','function normalizeExampleToken'];
for(const x of critical)if(!src.includes(x))throw new Error(`regression token missing: ${x}`);
const newReady=src.indexOf(readyToken),newPack=Math.max(src.lastIndexOf('const PACK=',newReady),src.lastIndexOf('let PACK=',newReady)),push=src.lastIndexOf('PACK.push(',newReady);if(!(newPack>=0&&push>newPack&&newReady>push))throw new Error('PACK initialization order regression');
const last=src.slice(push,newReady);for(const f of ['"tts_text":','"grammar_links":','"example_jp":','"word_notes":','"form_notes":'])if(last.split(f).length-1!==100)throw new Error(`field count ${f}`);if(last.split('文法ワンポイント：').length-1!==100)throw new Error('grammar point count');
for(let r=3001;r<=3100;r++)if((src.match(new RegExp(`"rank"\\s*:\\s*${r}(?=[,}])`,'g'))||[]).length<2)throw new Error(`rank/card mapping absent ${r}`);
fs.writeFileSync(file,src);
console.log(`AUDIT OK Daily5000 Rank ${START}-${END}: 100 cards; duplicate filtering; all-token form_notes; grammar links; TTS; storage/cloud/buttons/PACK order preserved`);
