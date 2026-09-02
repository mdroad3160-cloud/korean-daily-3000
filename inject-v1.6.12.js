'use strict';
const fs=require('fs');
const MAX_RANK=5000,MAX_ADD=100,VERSION='1.6.12';
const file=process.argv[2]||'_site/index.html';
let src=fs.readFileSync(file,'utf8');
const rows=x=>Array.isArray(x)?x:String(x||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(x=>x.split('|'));
const candidates=rows(require('./pack-next-v1.6.12.js'));
function parse(n){const m=src.match(new RegExp(`(?:const|let)\\s+${n}=(\\[.*?\\]);`,'s'));if(!m)throw Error(n+' missing');return{m:m[0],d:JSON.parse(m[1])};}
const R=parse('RANK'),P=parse('PACK'),G=parse('GRAMMAR');
const currentMax=Math.max(...R.d.map(x=>Number(x.rank)||0));
if(currentMax>=MAX_RANK){console.log(`Daily5000 ${VERSION}: already complete at Rank ${currentMax}; no changes`);process.exit(0);}
const START=currentMax+1,END_LIMIT=Math.min(MAX_RANK,START+MAX_ADD-1);
const norm=s=>String(s||'').replace(/[-\s]/g,'').trim();
const seen=new Set(R.d.map(x=>norm(x.word))),priorEx=new Set(P.d.map(x=>String(x.example||'').trim()).filter(Boolean)),selected=[],newEx=new Set();
for(const r of candidates){if(!Array.isArray(r)||r.length<5)throw Error('bad candidate');const w=norm(r[0]),e=String(r[2]||'').trim();if(!w||!e||seen.has(w)||selected.some(x=>norm(x[0])===w)||priorEx.has(e)||newEx.has(e))continue;selected.push(r);newEx.add(e);if(START+selected.length-1===END_LIMIT)break;}
if(!selected.length)throw Error('no unique candidates');
const END=START+selected.length-1;
const maxOrig=Math.max(...R.d.map(x=>Number(x.orig)||0)),nr=selected.map((x,i)=>({rank:START+i,word:x[0],confidence:'中（Daily5000拡張・日常実用性優先）',orig:maxOrig+i+1})),all=[...R.d,...nr];
if(new Set(all.map(x=>norm(x.word))).size!==all.length)throw Error('duplicate RANK word');
if(new Set(all.map(x=>Number(x.rank))).size!==all.length)throw Error('duplicate rank');
src=src.replace(R.m,`const RANK=${JSON.stringify(all)};`);
const grammarRanks=new Set(G.d.map(x=>Number(x.rank))),baseGrammar=grammarRanks.has(9)?9:Number(G.d[0]?.rank||1);
const clean=s=>String(s).replace(/^[“”‘’'"()[\]{}]+|[.,!?。！？;:…~“”‘’'"()[\]{}]+$/g,'');
const particles=['에서는','으로부터','에게서','한테서','에게','한테','까지','부터','처럼','보다','으로','에서','과','와','랑','이랑','로','은','는','이','가','을','를','에','도','만','의'];
const meanings=new Map(P.d.filter(x=>x&&x.word&&x.meaning).map(x=>[norm(x.word),String(x.meaning)]));for(const r of selected)meanings.set(norm(r[0]),String(r[1]));
const COMMON={오늘:'今日',내일:'明日',이번:'今回・今度の',다음:'次の',주:'週',달:'月',시간:'時間',조금:'少し',너무:'とても・あまりに',잘:'よく・うまく',바로:'すぐ',먼저:'先に',다시:'再び',꼭:'必ず',아직:'まだ',벌써:'もう・すでに',보통:'普通・通常',정도:'程度',하나:'一つ',이름:'名前',문자:'SMS・文字',앱:'アプリ',휴대폰:'携帯電話',카드:'カード',여행:'旅行',공항:'空港',회사:'会社',병원:'病院',물:'水',고기:'肉',옷:'服',밥:'ご飯',약:'薬',서류:'書類',상품:'商品',물건:'物・品物',짐:'荷物'};
function stemOf(w){let s=norm(w);if(s.endsWith('하다'))return s.slice(0,-2);if(s.endsWith('되다'))return s.slice(0,-1);if(s.endsWith('다'))return s.slice(0,-1);return s;}
function formDesc(c){if(/했다고$/.test(c))return '하다系用言＋過去引用 -았/었다고';if(/한다고$/.test(c))return '하다系用言＋現在引用 -ㄴ/는다고';if(/했어요$/.test(c))return '하다系用言の過去丁寧形';if(/됐어요$/.test(c))return '되다の過去丁寧形';if(/았어요$|었어요$/.test(c))return '用言の過去丁寧形 -았/었어요';if(/기로$/.test(c))return '用言＋-기로（決定・約束）';if(/아야$|어야$|해야$/.test(c))return '必要・義務 -아/어야 하다';if(/세요$/.test(c))return '丁寧な依頼・命令 -(으)세요';if(/해요$|아요$|어요$/.test(c))return '用言の現在丁寧形 -아/어요';if(/해서$|아서$|어서$/.test(c))return '理由・順序 -아/어서';if(/으면$|면$/.test(c))return '条件 -(으)면';if(/려고$/.test(c))return '意図・目的 -(으)려고';if(/도록$/.test(c))return '目的・程度 -도록';if(/고$/.test(c))return '接続語尾 -고';return '';}
function noteToken(t){const c=clean(t),n=norm(c);if(!c)return'';if(COMMON[c])return `${c}：${COMMON[c]}`;if(meanings.has(n))return `${c}：${meanings.get(n)}`;for(const p of particles){if(c.endsWith(p)&&c.length>p.length){const b=c.slice(0,-p.length),bn=norm(b),bm=meanings.get(bn)||COMMON[b];if(bm)return `${c}：${b}「${bm}」＋助詞 ${p}`;return `${c}：${b}＋助詞 ${p}`;}}const hits=[...meanings.entries()].map(([w,m])=>[w,m,stemOf(w)]).filter(x=>x[2].length>=2&&n.startsWith(x[2])).sort((a,b)=>b[2].length-a[2].length);if(hits.length){const[w,m]=hits[0],d=formDesc(c);return `${c}：${w}「${m}」の語形${d?`（${d}）`:''}`;}const d=formDesc(c);if(d)return `${c}：${d}`;return `${c}：例文内の語彙。日本語訳と対応して基本意味と文中の役割を確認`;}
const cards=selected.map((r,i)=>{const[word,meaning,example,jp,note]=r,rank=START+i,form_notes={};for(const t of example.split(/\s+/).map(clean).filter(Boolean))form_notes[t]=noteToken(t);return{rank,word,meaning,example,example_jp:jp,jp,translation:jp,form_notes,grammar:[baseGrammar],grammar_ranks:[baseGrammar],grammar_links:[baseGrammar],grammar_point:'文法ワンポイント：해요体を中心に、助詞・時制・条件・依頼・引用など例文の活用をform_notesで確認。',note,word_notes:note,tts:example,tts_text:example,ready:true};});
const pack=[...P.d,...cards];src=src.replace(P.m,`const PACK=${JSON.stringify(pack)};`);
for(const c of cards){if(!c.tts_text||!c.example_jp||!c.meaning||!c.word_notes||!Object.keys(c.form_notes).length)throw Error('field missing '+c.rank);for(const t of c.example.split(/\s+/).map(clean).filter(Boolean))if(!c.form_notes[t])throw Error('unexplained '+c.rank+':'+t);if(c.translation!==c.jp||c.jp!==c.example_jp||c.tts_text!==c.example)throw Error('translation/tts mismatch '+c.rank);for(const gr of c.grammar_links)if(!grammarRanks.has(Number(gr)))throw Error('grammar link missing '+c.rank);}
for(const key of ['korean-daily-3000-state-v01','korean-daily-3000-settings-v01','korean-daily-3000-sync-v01'])if(!src.includes(key))throw Error('storage key missing '+key);
for(const s of ['normalizeExampleToken','function initCloudSync(','function syncCloudCore(','function queueCloudSave(','id="startBtn"','id="showAnswerBtn"','id="knownBtn"','id="saveSettingsBtn"','id="cloudSyncNowBtn"'])if(!src.includes(s))throw Error('core marker missing '+s);
const pp=src.search(/(?:const|let) PACK=/),rp=src.indexOf('const READY=new Map(PACK.filter');if(!(pp>=0&&rp>pp))throw Error('PACK/READY order invalid');
if(new Set(all.map(x=>norm(x.word))).size!==all.length)throw Error('duplicate audit failed');
if(new Set(pack.map(x=>Number(x.rank))).size!==pack.length)throw Error('PACK duplicate rank');
if(cards.some(x=>priorEx.has(String(x.example||'').trim())))throw Error('example overlap');
fs.writeFileSync(file,src);
console.log(`Daily5000 ${VERSION}: Rank ${START}-${END} injected; selected=${selected.length}; RANK=${all.length}, PACK=${pack.length}`);
require('child_process').execFileSync(process.execPath,['inject-v1.6.13.js',file],{stdio:'inherit'});
