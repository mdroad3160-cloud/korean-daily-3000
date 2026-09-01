'use strict';
const fs=require('fs');
const START=3301,END=3400,VERSION='1.5.3';
const file=process.argv[2]||'_site/index.html';
let src=fs.readFileSync(file,'utf8');
const candidates=require('./pack-3301-3400-v1.5.3.js');
function parse(name){const m=src.match(new RegExp(`(?:const|let)\\s+${name}=(\\[.*?\\]);`,'s'));if(!m)throw Error(name+' missing');return {m:m[0],d:JSON.parse(m[1])};}
const R=parse('RANK'),P=parse('PACK'),G=parse('GRAMMAR');
const norm=s=>String(s||'').replace(/[-\\s]/g,'').trim();
const seen=new Set(R.d.map(x=>norm(x.word))),selected=[];
for(const row of candidates){if(!Array.isArray(row)||row.length<5)throw Error('bad candidate');if(seen.has(norm(row[0]))||selected.some(x=>norm(x[0])===norm(row[0])))continue;selected.push(row);if(selected.length===100)break;}
if(selected.length!==100)throw Error('only '+selected.length+' unique candidates');
const maxOrig=Math.max(...R.d.map(x=>Number(x.orig)||0));
const nr=selected.map((x,i)=>({rank:START+i,word:x[0],confidence:'中（Daily5000拡張）',orig:maxOrig+i+1}));
const all=[...R.d,...nr];if(new Set(all.map(x=>norm(x.word))).size!==all.length)throw Error('duplicate RANK');
src=src.replace(R.m,`const RANK=${JSON.stringify(all)};`);
const grammarRanks=new Set(G.d.map(x=>Number(x.rank)));const baseGrammar=grammarRanks.has(9)?9:Number(G.d[0]?.rank||1);
const clean=s=>String(s).replace(/^[“”‘’'"()[\\]{}]+|[.,!?。！？;:…~“”‘’'"()[\\]{}]+$/g,'');
const particles=['에서는','에서','에게','까지','부터','으로','로','은','는','이','가','을','를','에','도','만','의'];
function noteToken(t){const c=clean(t);for(const p of particles)if(c.endsWith(p)&&c.length>p.length)return `${c}：${c.slice(0,-p.length)}＋助詞 ${p}`;if(/해야\\s*해요$/.test(c))return `${c}：義務 -아/어야 하다`;if(/했어요$/.test(c))return `${c}：하다系用言の過去丁寧形 -했어요`;if(/았어요$|었어요$/.test(c))return `${c}：用言の過去丁寧形 -았/었어요`;if(/해요$|아요$|어요$/.test(c))return `${c}：用言の現在丁寧形 -아/어요`;if(/세요$/.test(c))return `${c}：丁寧な依頼・命令 -(으)세요`;if(/해서$|아서$|어서$/.test(c))return `${c}：理由・順序 -아/어서`;if(/니까$/.test(c))return `${c}：理由・発見の契機 -(으)니까`;return `${c}：例文中の語。日本語訳の対応箇所と合わせて意味・用法を確認`;}
const prior=new Set(P.d.map(x=>x.example).filter(Boolean));
const cards=selected.map((r,i)=>{const [word,meaning,example,jp,note]=r,rank=START+i;if(prior.has(example))throw Error('duplicate example '+rank);prior.add(example);const form_notes={};for(const t of example.split(/\\s+/).map(clean).filter(Boolean))form_notes[t]=noteToken(t);return {rank,word,meaning,example,jp,translation:jp,form_notes,grammar:[baseGrammar],grammar_links:[baseGrammar],grammar_point:'해요体を中心に、例文内の助詞・活用をform_notesで確認。',note,tts:example,tts_text:example};});
const pack=[...P.d,...cards];src=src.replace(P.m,`const PACK=${JSON.stringify(pack)};`);
for(const c of cards){if(!c.tts||!c.jp||!c.meaning||!Object.keys(c.form_notes).length)throw Error('card field missing '+c.rank);for(const t of c.example.split(/\\s+/).map(clean).filter(Boolean))if(!c.form_notes[t])throw Error('unexplained '+c.rank+':'+t);if(c.translation!==c.jp||c.tts_text!==c.example)throw Error('translation/tts mismatch '+c.rank);for(const gr of c.grammar_links)if(!grammarRanks.has(Number(gr)))throw Error('grammar link missing '+c.rank);}
for(let r=START;r<=END;r++)if(!pack.some(c=>Number(c.rank)===r))throw Error('PACK rank missing '+r);
for(const key of ['korean-daily-3000-state-v01','korean-daily-3000-settings-v01'])if(!src.includes(key))throw Error('storage key missing '+key);
for(const s of ['normalizeExampleToken','PACK','READY'])if(!src.includes(s))throw Error('core marker missing '+s);
fs.writeFileSync(file,src);console.log(`Daily5000 ${VERSION}: Rank ${START}-${END} injected; RANK=${all.length}, PACK=${pack.length}`);
