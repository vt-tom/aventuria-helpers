import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HERO_PORTRAITS, heroPortrait, bindPortraitFallback } from '../../scripts/actors/hero-portrait.mjs';
for (const [name,file] of Object.entries(HERO_PORTRAITS)) {
 const actor=Object.freeze({type:'aventuria.hero',name:name.toUpperCase()+' Test',img:'original.webp'});
 assert.equal(heroPortrait(actor),'modules/aventuria/assets/art/'+file);
 assert.ok(existsSync('D:/FoundryVTT/user-data-paths/v14-aventuria/Data/modules/aventuria/assets/art/'+file),file);
 assert.equal(actor.img,'original.webp');
}
assert.equal(heroPortrait({type:'aventuria.hero',name:'Unknown Hero',img:'custom.webp'}),'custom.webp');
assert.equal(heroPortrait({type:'other',name:'Yoleyana',img:'other.webp'}),'other.webp');
assert.equal(heroPortrait({type:'aventuria.hero',name:'  Yoleyana Ahornlied ',img:'card.webp'}),'modules/aventuria/assets/art/yoleyana-maplesong.webp');
let error;
const image={src:'new.webp',dataset:{portraitFallback:'old.webp',src:'new.webp'},complete:true,naturalWidth:0,getAttribute(){return this.src;},addEventListener(event,fn){error=fn;}};
bindPortraitFallback({querySelectorAll:()=>[image]});assert.equal(image.src,'old.webp');assert.equal(image.dataset.src,'old.webp');
error();assert.equal(image.src,'old.webp');
console.log('Passed: all hero art files, aliases, localized surnames, unchanged actor, unknown/type fallback, missing-image fallback and image popout source.');

const pairs=[['Brutack Parinor','Brutack Parinor'],['Fortran Algolson','Fortan Algolson'],['Iridya Funkenschlag','Iridya Emberstrike'],['Jandriel Kupfermond','Jandriel Coppermoon'],['Karmal Eternius','Karmal Eternius'],['Kjaska Sternensegler','Kjaska Starsailer'],['Lavalox Silberschmied','Lavalox Silversmith'],['Miraculo Marvelli','Miraculo Marvelli'],['Peraike Alrikshuber','Peraike Alrikshuber'],['Selestia saba Okarim','Selestia saba Okarim'],['Tsaiana die Spinne','Tsaiana the Spider'],['Yoleyana Ahornlied','Yoleyana Maplesong']];
for(const [de,en] of pairs) assert.equal(heroPortrait({type:'aventuria.hero',name:de}),heroPortrait({type:'aventuria.hero',name:en}));
assert.equal(new Set(pairs.map(([name])=>heroPortrait({type:'aventuria.hero',name}))).size,12);
console.log('Passed: twelve distinct portraits with German and English name variants.');
