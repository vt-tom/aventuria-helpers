import assert from 'node:assert/strict';
const hooks=new Map();const messages=[];
globalThis.Hooks={on:(name,fn)=>hooks.set(name,fn)};
globalThis.game={i18n:{localize:key=>key}};
globalThis.Roll=class {constructor(formula){this.formula=formula;}async evaluate(){}async toMessage(data,options){messages.push({formula:this.formula,data,options});}};
const {rollEnemyDie,registerEnemyActions}=await import('../../scripts/apps/enemy-actions.mjs');
const card={documentName:'Card',type:'aventuria.henchman',isOwner:true,name:'Goblin <script>'};
await rollEnemyDie(card,20);await rollEnemyDie(card,6);
assert.deepEqual(messages.map(m=>m.formula),['1d20','1d6']);assert.match(messages[0].data.flavor,/&lt;script&gt;/);assert.deepEqual(messages[0].data.whisper,[]);assert.equal(messages[0].options.rollMode,'publicroll');
await rollEnemyDie({...card,isOwner:false},20);await rollEnemyDie({...card,type:'aventuria.action'},20);await rollEnemyDie(card,100);assert.equal(messages.length,2);
class Element{constructor(){this.children=[];this.listeners={};}append(...children){this.children.push(...children);}setAttribute(name,value){this[name]=value;}addEventListener(name,fn){this.listeners[name]=fn;}}
globalThis.document={createElement:()=>new Element()};
globalThis.foundry={utils:{fromUuid:async()=>card}};
const figure=new Element();const root={querySelector:selector=>selector==='figure'?figure:figure.children.find(c=>c.className==='aventuria-enemy-actions'),classList:{add(){}}};
registerEnemyActions();const render=hooks.get('renderImagePopout');
await render({options:{uuid:'Cards.stack.Card.card'},element:root},root);assert.equal(figure.children.length,1);assert.equal(figure.children[0].children.length,2);
await render({options:{uuid:'Cards.stack.Card.card'},element:root},root);assert.equal(figure.children.length,1,'Re-render must not duplicate buttons');
await figure.children[0].children[0].children[0].listeners.click();assert.equal(messages.length,3);
console.log('Passed: D20/D6 public rolls, escaped card name, type/permission guards, preview buttons, no duplicates.');

await rollEnemyDie(card,6,{count:2,modifier:3});assert.equal(messages.at(-1).formula,'2d6+3');
await rollEnemyDie(card,6,{count:3,modifier:-2});assert.equal(messages.at(-1).formula,'3d6-2');
for (const options of [{count:0},{count:1.5},{count:101},{modifier:NaN},{modifier:1.5}]) await assert.rejects(rollEnemyDie(card,6,options));
const group=figure.children[0].children[1];
group.children[0].children[1].value='2';group.children[1].children[1].value='-1';
await group.children[2].listeners.click();assert.equal(messages.at(-1).formula,'2d6-1');
console.log('Passed: configurable D6 count, positive/negative modifiers, invalid values, preview input wiring.');

for (const type of ['aventuria.henchman','aventuria.leader','aventuria.wildcard','aventuria.demon']) {
  const enemy={...card,type};
  await rollEnemyDie(enemy,20);assert.equal(messages.at(-1).formula,'1d20');
  await rollEnemyDie(enemy,6,{count:2,modifier:-1});assert.equal(messages.at(-1).formula,'2d6-1');
  foundry.utils.fromUuid=async()=>enemy;
  const enemyFigure=new Element();
  const enemyRoot={querySelector:selector=>selector==='figure'?enemyFigure:enemyFigure.children.find(c=>c.className==='aventuria-enemy-actions'),classList:{add(){}}};
  await render({options:{uuid:'Cards.stack.Card.card'},element:enemyRoot},enemyRoot);
  assert.equal(enemyFigure.children[0].children.length,2,`Toolbar for ${type}`);
  foundry.utils.fromUuid=async()=>({...enemy,isOwner:false});
  const deniedFigure=new Element();
  await render({options:{uuid:'Cards.stack.Card.card'},element:{querySelector:()=>deniedFigure}},null);
  assert.equal(deniedFigure.children.length,0,'Owner required for each enemy type');
}
console.log('Passed: rolls and preview controls for all four enemy types, ownership enforced.');
