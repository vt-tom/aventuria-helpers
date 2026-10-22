import assert from 'node:assert/strict';
import { onlineHeroes, openTrayProbes, closeTrayMenu } from '../../scripts/apps/tray-menu.mjs';
const hero = {img:'original.webp',id:'a',name:'A',type:'aventuria.hero',isOwner:true,system:{close:10,ranged:8,magic:0,dodge:6,skills:Object.fromEntries(['body','craft','knowledge','perception','persuade','stealth','survival','willpower'].map(k=>[k,5])),basicEquipment:{name:'Sword'}}};
const other = {...hero,id:'b',name:'B'};
assert.deepEqual(onlineHeroes([{active:true,character:hero},{active:true,character:hero},{active:false,character:other},{active:true,isGM:true,character:other},{active:true,character:{type:'other'}}]),[hero,other]);
assert.deepEqual(onlineHeroes([]),[]);
assert.deepEqual(onlineHeroes([{active:true,isGM:true,character:hero},{active:true,isGM:true,character:other},{active:false,isGM:true,character:{...hero,id:'offline'}}]),[hero,other], 'All participants can be GMs; only online status and hero assignment filter');
class Element {
 constructor(){this.children=[];this.style={};this.listeners={};}
 append(...children){this.children.push(...children);}
 addEventListener(name,fn){this.listeners[name]=fn;}
 remove(){document.body.children=document.body.children.filter(c=>c!==this);}
 focus(){}
}
globalThis.document={body:new Element(),createElement:()=>new Element(),addEventListener(){},removeEventListener(){}};
globalThis.window={innerWidth:1000,innerHeight:800};
const notices=[];
let templateData;
globalThis.renderTemplate=async(path,data)=>{templateData=data;return 'A chat card';};
const messages=[];globalThis.ChatMessage={create:async data=>messages.push(data)};
globalThis.ui={notifications:{info:msg=>notices.push(msg),warn:msg=>notices.push(msg)}};
globalThis.game={i18n:{localize:k=>k,lang:'en',format:(k,{name})=>name},users:[{active:true,name:'Player <A>',character:hero}]};
const anchor={x:20,y:790};
openTrayProbes(hero,anchor);
let menu=document.body.children[0].children[0];
assert.equal(menu.children.length,5,'Three groups, random hero and centre');
await menu.children[2].listeners.click();
menu=document.body.children[0].children[0];
assert.equal(menu.children.length,9,'All eight skills available');
assert.ok(parseFloat(menu.style.left)>=217,'Menu stays inside left edge');
menu.children[0].listeners.click();
assert.equal(document.body.children[0].children[0].children.length,5,'Back returns to groups');
closeTrayMenu();
openTrayProbes({...hero,isOwner:false},anchor);
assert.equal(document.body.children.length,0,'Non-owner cannot open probes');
openTrayProbes(hero,anchor);
await document.body.children[0].children[0].children[4].listeners.click();
assert.equal(notices.length,0);
assert.equal(messages.length,1);assert.deepEqual(messages[0].whisper,[]);assert.equal(messages[0].blind,false);assert.match(messages[0].content,/A/);
assert.equal(templateData.player,'Player <A>');assert.equal(templateData.name,'A');assert.equal(templateData.portrait,'original.webp');
assert.equal(document.body.children.length,0);
console.log('Passed: online-player filtering, duplicate assignments, all skills, back, permissions, viewport placement, random result without switching.');
