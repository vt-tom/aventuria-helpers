import assert from 'node:assert/strict';
class Base {
 constructor(document){this.document=document;this.isEditable=true;}
 _getCardContextOptions(){return [{label:'existing'}];}
}
globalThis.ccm={apps:{CardsSheets:{DockedHandSheet:Base}}};
globalThis.game={};
const {registerHandSheet}=await import('../../scripts/sheets/hand-sheet.mjs');registerHandSheet();
const {AventuriaHelpersHandSheet}=await import('../../scripts/sheets/hand-sheet.mjs');
const moves=[];let shuffled=0;
const folder={id:'hero-folder'};
const deck={type:'deck',folder,isOwner:true,getFlag:()=>null,shuffle:async()=>{shuffled++;}};
const discard={type:'pile',folder,isOwner:true,getFlag:()=>null};
const otherDeck={type:'deck',folder:{id:'foreign'},getFlag:()=>null};
const card={id:'c',isOwner:true,flags:{}};
const hand={folder,cards:new Map([['c',card]]),pass:async(target,ids)=>{moves.push({target,ids});return [card];}};card.parent=hand;
game.cards=[otherDeck,deck,discard];
const sheet=new AventuriaHelpersHandSheet(hand);
const entries=sheet._getCardContextOptions();assert.equal(entries.length,3);assert.equal(entries[0].label,'existing');
await entries[1].callback({dataset:{cardId:'c'}});assert.equal(moves[0].target,discard);
await entries[2].callback({dataset:{cardId:'c'}});assert.equal(moves[1].target,deck);assert.equal(shuffled,1);
await entries[2].callback({dataset:{cardId:'stale'}});assert.equal(moves.length,2);
card.isOwner=false;await entries[2].callback({dataset:{cardId:'c'}});assert.equal(moves.length,2);
sheet.isEditable=false;assert.equal(sheet._getCardContextOptions().length,1);
console.log('Passed: inherited hand menu, correct sibling targets, discard, shuffled deck return, stale card and permission guards.');
