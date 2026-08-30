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
html=html.replaceAll('const APP_VERSION="1.2";','const APP_VERSION="1.3";');
html=html.replaceAll('FSRS · v1.2','FSRS · v1.3');
html=html.replaceAll('Web公開版 v1.2','Web公開版 v1.3');
html=html.replaceAll('教材化済み：Rank 1–500','教材化済み：Rank 1–600');
html=html.replaceAll('Rank 1–500（うちRank 40','Rank 1–600（うちRank 40');
if(!html.includes('"rank":600,"word":"어울리다"'))throw new Error('Rank 600 injection failed');
fs.writeFileSync(file,html);
console.log('AUDIT OK: Rank 501-600 = 100 cards; required fields complete; duplicate examples = 0');
