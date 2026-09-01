// Daily5000 build chain through Rank 3600 (v1.5.5)
const fs=require('fs'),cp=require('child_process');
const input=process.argv[2];
const output=process.argv[3];
if(!input||!output) throw new Error('usage: node normalize-build-input.js input output');
let s=fs.readFileSync(input,'utf8');
for(const name of ['RANK','PACK','GRAMMAR']){const re=new RegExp(`(?:const|let|var)\\s+${name}\\s*=`);if(!re.test(s))throw new Error(`${name} declaration not found`);s=s.replace(re,`const ${name}=`);}
for(const f of ['pack-2701-2800-v1.4.27.js','inject-v1.4.27.js','finalize-v1.4.27.js','pack-3001-3100-v1.5.0.js','inject-v1.5.0.js','pack-3101-3200-v1.5.1.js','inject-v1.5.1.js','pack-3201-3300-v1.5.2.js','inject-v1.5.2.js','pack-3301-3400-v1.5.3.js','inject-v1.5.3.js','pack-3401-3500-v1.5.4.js','pack-3401-3500-extra-v1.5.4.js','inject-v1.5.4.js','pack-3501-3600-v1.5.5.js','pack-3501-3600-extra-v1.5.5.js','inject-v1.5.5.js'])cp.execFileSync(process.execPath,['--check',f],{stdio:'inherit'});
const hooks=[['inject-v1.4.26.js',"require('./inject-v1.4.27.js')","\nrequire('./inject-v1.4.27.js');\nrequire('./finalize-v1.4.27.js');\n"],['inject-v1.4.29.js',"require('./inject-v1.5.0.js')","\nrequire('./inject-v1.5.0.js');\n"],['inject-v1.5.0.js',"require('./inject-v1.5.1.js')","\nrequire('./inject-v1.5.1.js');\n"],['inject-v1.5.1.js',"require('./inject-v1.5.2.js')","\nrequire('./inject-v1.5.2.js');\n"],['inject-v1.5.2.js',"require('./inject-v1.5.3.js')","\nrequire('./inject-v1.5.3.js');\n"],['inject-v1.5.3.js',"require('./inject-v1.5.4.js')","\nrequire('./inject-v1.5.4.js');\n"],['inject-v1.5.4.js',"require('./inject-v1.5.5.js')","\nrequire('./inject-v1.5.5.js');\n"]];
for(const [file,needle,hook] of hooks){let x=fs.readFileSync(file,'utf8');if(!x.includes(needle))fs.writeFileSync(file,x+hook);}
fs.writeFileSync(output,s);console.log('Normalized build source declarations; Daily5000 Rank 3001-3600 chain prepared and audited');
