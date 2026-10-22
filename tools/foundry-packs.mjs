// Compendium-Werkzeug fuer deploy-foundry.ps1 (identisch in allen Development-Modulen, Vorbild: Myranor-workflow.mjs).
// Quellen: packs/_source/<name>/*.json (Git). Die Foundry-CLI oeffnet ausschliesslich Wegwerfkopien, nie eine
// Foundry-Datenbank oder Sicherung.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const local = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(local);
const [command, ...args] = process.argv.slice(2);
const read = async p => JSON.parse((await fs.readFile(p, 'utf8')).replace(/^\uFEFF/, ''));
const write = async (p, value) => { await fs.mkdir(path.dirname(p), {recursive:true}); await fs.writeFile(p, JSON.stringify(value,null,2)+'\n'); };
const exists = async p => !!(await fs.stat(p).catch(()=>null));
const stamp = () => new Date().toISOString().replace(/[:.]/g,'-');
const manifest = await read(path.join(root,'module.json'));
const packs = manifest.packs ?? [];
const sources = path.join(root,'packs','_source');
const packDef = name => { const p=packs.find(p=>p.name===name); if(!p) throw Error('Unbekannter Pack: '+name); return p; };
async function cli() {
 try { return await import('@foundryvtt/foundryvtt-cli'); }
 catch { throw Error('Foundry-CLI fehlt: npm install --save-dev @foundryvtt/foundryvtt-cli'); }
}
// createdTime/modifiedTime/lastModifiedBy aendert Foundry ohne inhaltliche Bearbeitung.
function stable(v, semantic=false) {
 if(Array.isArray(v)) return v.map(x=>stable(x,semantic));
 if(v && typeof v==='object') return Object.fromEntries(Object.keys(v).sort().filter(k=>!(semantic && ['createdTime','modifiedTime','lastModifiedBy'].includes(k))).map(k=>[k,stable(v[k],semantic)]));
 return v;
}
const equal = (a,b,semantic=false) => JSON.stringify(stable(a,semantic))===JSON.stringify(stable(b,semantic));
async function docs(dir) {
 const result=new Map();
 for(const f of await fs.readdir(dir)) if(f.endsWith('.json')) {const d=await read(path.join(dir,f)); if(!d._key || !d._id) throw Error('ID/Key fehlt: '+f); if(result.has(d._key)) throw Error('Doppelter Key: '+d._key); result.set(d._key,{file:f,doc:d});}
 return result;
}
const docsOrEmpty = dir => docs(dir).catch(e=>{if(e.code==='ENOENT') return new Map(); throw e;});
function differences(a,b,prefix='') {
 if(equal(a,b,true)) return [];
 if(a && b && typeof a==='object' && typeof b==='object' && !Array.isArray(a) && !Array.isArray(b)) return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>differences(a[k],b[k],prefix?prefix+'.'+k:k));
 return [prefix];
}
async function compare(a,b) {
 const report=[];
 for(const p of packs) {
  const left=await docsOrEmpty(path.join(a,p.name)),right=await docsOrEmpty(path.join(b,p.name));
  for(const key of new Set([...left.keys(),...right.keys()])) {
   const x=left.get(key),y=right.get(key);
   if(!x || !y || !equal(x.doc,y.doc,true)) report.push({pack:p.name,id:(y??x).doc._id,name:(y??x).doc.name,file:(y??x).file,status:!x?'added':!y?'deleted':'changed',fields:x&&y?differences(x.doc,y.doc):[]});
  }
 }
 return report;
}
// Foundry-Start per pm2 oder direkt: massgeblich ist nur --dataPath (exakt, v14 ist Praefix von v14-aventuria).
async function assertStopped(moduleDir) {
 const normalized=path.resolve(moduleDir).replaceAll('\\','/').toLowerCase();
 const i=normalized.indexOf('/data/');
 if(i<0) return;
 const data=normalized.slice(0,i);
 const raw=execFileSync('powershell.exe',['-NoProfile','-Command',"Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -or $_.Name -like '*Foundry*' } | Select-Object -ExpandProperty CommandLine | ConvertTo-Json -Compress"],{encoding:'utf8'});
 const rows=[JSON.parse(raw||'[]')].flat();
 if(rows.some(c=>{const cmd=String(c).replaceAll('\\','/').toLowerCase();const at=cmd.search(/--datapath[= ]/);return at>-1 && cmd.slice(at+11).replace(/^"/,'').split(/["\s]/)[0].replace(/\/$/,'')===data;})) throw Error('Foundry mit diesem Datenpfad laeuft. Zuerst zum Setup zurueckkehren und den Server stoppen: '+data);
}
async function extract(moduleDir,dest,{checkRunning=true}={}) {
 if(checkRunning) await assertStopped(moduleDir);
 if(await exists(dest)) throw Error('Exportziel existiert bereits: '+dest);
 const {extractPack}=await cli();
 const temp=path.join(root,'.deploy','scratch',stamp());
 for(const p of packs) {
  const source=path.join(moduleDir,p.path);
  await fs.mkdir(path.join(dest,p.name),{recursive:true});
  if(!await exists(source)) continue;
  const copied=path.join(temp,p.name);
  await fs.cp(source,copied,{recursive:true,filter:s=>path.basename(s)!=='LOCK'});
  await extractPack(copied,path.join(dest,p.name),{log:false});
 }
 await fs.rm(temp,{recursive:true,force:true});
}
async function build(dest) {
 if(await exists(dest)) throw Error('Buildziel existiert bereits: '+dest);
 const {compilePack}=await cli();
 for(const p of packs) await docs(path.join(sources,p.name));
 await fs.cp(sources,path.join(dest,'sources'),{recursive:true});
 for(const p of packs) await compilePack(path.join(dest,'sources',p.name),path.join(dest,p.path),{log:false});
 // Rueckexport muss exakt den Quellen entsprechen.
 const roundtrip=path.join(dest,'verified-json');
 await extract(dest,roundtrip,{checkRunning:false});
 for(const p of packs) {
  const a=await docs(path.join(dest,'sources',p.name)),b=await docs(path.join(roundtrip,p.name));
  if(a.size!==b.size || [...a].some(([k,v])=>!b.has(k)||!equal(v.doc,b.get(k).doc))) throw Error('Rueckexport weicht ab: '+p.name);
 }
 await write(path.join(dest,'build.json'),{verified:true,packs:packs.map(p=>p.name)});
}
try {
 if(command==='build') {await build(path.resolve(args[0])); console.log('Build per Rueckexport geprueft: '+path.resolve(args[0]));}
 else if(command==='export') {await extract(path.resolve(args[0]),path.resolve(args[1])); console.log('Export: '+path.resolve(args[1]));}
 else if(command==='compare') {
  const acceptAt=args.indexOf('--accept');
  const dirs=args.filter((a,i)=>!a.startsWith('--') && i!==acceptAt+1);
  if(!dirs.length) throw Error('Vergleichsordner fehlt.');
  let report=await compare(dirs.length>1?path.resolve(dirs[0]):sources,path.resolve(dirs.at(-1)));
  // Abweichungen, die bereits im --accept-Stand stehen (z.B. per adopt uebernommen), sind nicht mehr gefaehrdet.
  if(acceptAt>-1) {const accepted=await compare(path.resolve(args[acceptAt+1]),path.resolve(dirs.at(-1))); report=report.filter(r=>accepted.some(a=>a.pack===r.pack && a.id===r.id));}
  console.log(JSON.stringify(report,null,2));
  if(report.length && args.includes('--fail-on-diff')) process.exitCode=3;
 } else if(command==='adopt') {
  const [candidate,pack,id]=args; packDef(pack);
  const selected=[...(await docs(path.join(path.resolve(candidate),pack))).values()].find(x=>x.doc._id===id);
  if(!selected) throw Error('Dokument nicht gefunden.');
  const previous=(await docsOrEmpty(path.join(sources,pack))).get(selected.doc._key);
  if(!previous && !args.includes('--new')) throw Error('Neues Dokument: Ordner/Verweise pruefen, dann mit --new uebernehmen.');
  if(previous) await write(path.join(root,'.deploy','adoption-history',stamp(),pack,previous.file),previous.doc);
  await write(path.join(sources,pack,previous?.file??selected.file),selected.doc);
  console.log('Uebernommen: '+selected.doc.name+(previous?'; vorheriger Stand in .deploy/adoption-history gesichert.':' (neu).'));
 }
 else if(command==='pm2-find') {
  // pm2-Prozess zu genau diesem --dataPath (exakt, v14 ist Praefix von v14-aventuria); Ausgabe "<pm_id> <status>" oder nichts.
  const norm=p=>p.replace(/\\/g,'/').replace(/\/+$/,'').toLowerCase();
  const raw=execFileSync('pm2 jlist',{encoding:'utf8',shell:true,windowsHide:true});
  for(const p of JSON.parse(raw.slice(raw.indexOf('[')))) {
   const argv=[p.pm2_env?.args??[]].flat().join(' ');
   const m=/--datapath[= ]"?([^"\s]+)/i.exec(argv);
   if(m && norm(m[1])===norm(args[0])) {console.log(p.pm_id+' '+p.pm2_env.status); break;}
  }
 }
 else throw Error('Befehle: build <Ziel> | export <Modulordner> <Ziel> | compare [QuelleA] <QuelleB> [--accept <Ordner>] [--fail-on-diff] | adopt <Exportordner> <Pack> <ID> [--new] | pm2-find <dataPath>');
} catch(e) { console.error(e.message); process.exitCode=1; }
