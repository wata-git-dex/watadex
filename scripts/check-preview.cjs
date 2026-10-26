const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let count=0;for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){new vm.Script(match[1]);count++}
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'artwork.js'),'utf8'),sandbox);
for(const entries of Object.values(sandbox.window.WATADEX_ARTWORK))for(const file of Object.values(entries))if(!fs.existsSync(path.join(root,file)))throw Error('Missing artwork: '+file);
const inventory=JSON.parse(fs.readFileSync(path.join(root,'design/sprite-inventory.json'),'utf8'));const keys=new Set();
for(const row of inventory){const key=row.kind+':'+row.key;if(keys.has(key))throw Error('Duplicate sprite key '+key);keys.add(key)}
if(!html.includes('e.inspiration?"INSPIRED BY "+e.inspiration.toUpperCase():"WATAMON REGION"'))throw Error('Missing null-safe region label');
console.log(`PASS: ${count} inline scripts, artwork paths, ${keys.size} unique sprite slots, null-safe region labels.`);
