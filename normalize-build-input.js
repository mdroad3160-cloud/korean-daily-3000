const fs=require('fs');
const input=process.argv[2];
const output=process.argv[3];
if(!input||!output) throw new Error('usage: node normalize-build-input.js input output');
let s=fs.readFileSync(input,'utf8');
const rm=s.match(/const RANK=(\[[\s\S]*?\]);/);
if(rm){const ranks=JSON.parse(rm[1]);console.log('NEXT_RANKS_2701_2800='+JSON.stringify(ranks.filter(x=>x.rank>=2701&&x.rank<=2800).map(x=>[x.rank,x.word])));}
for(const name of ['RANK','PACK','GRAMMAR']){
  const re=new RegExp(`(?:const|let|var)\\s+${name}\\s*=`);
  if(!re.test(s)) throw new Error(`${name} declaration not found`);
  s=s.replace(re,`const ${name}=`);
}
fs.writeFileSync(output,s);
console.log('Normalized build source declarations');
