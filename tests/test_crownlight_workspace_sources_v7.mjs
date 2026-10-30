import assert from 'node:assert/strict';
import {normalizeWorkspace} from '../functions/api/chart-workspace.js';
const permission={tier:'PROFESSIONAL',allowed:['STANDARD','ADVANCED','PROFESSIONAL']};
const candle=(timestamp,value)=>({timestamp,value});
const level=(value)=>({name:'horizontalStraightLine',points:[candle(1715088600000,value)]});
const groups=[
 {context:'tiingo_byo|AAPL',drawings:[level(187.5)]},
 {context:'alpaca_byo|MSFT',drawings:[level(413.8)]}
];
const saved=normalizeWorkspace({version:2,selected:'PROFESSIONAL',layout:'STACKED',
 drawingSets:groups,drawings:groups[0].drawings,drawingContext:groups[0].context,
 token:'NEVER_RECORD'},permission);
assert.equal(saved.drawingSets.length,2);
assert.deepEqual(saved.drawingSets[0].drawings,[level(187.5)]);
assert.deepEqual(saved.drawingSets[1].drawings,[level(413.8)]);
assert.equal(saved.layout,'STACKED');
assert.equal(saved.token,undefined);
const invalid=normalizeWorkspace({selected:'PROFESSIONAL',drawingSets:[
 groups[0],groups[0],
 {context:'unsafe<markup>',drawings:[level(1)]},
 {context:'tiingo_byo|TSLA',drawings:[{name:'raw_html',points:[candle(1715088600000,1)]}]},
 {context:'alpaca_byo|QQQ',drawings:[{name:'segment',
   points:[candle(1715088600000,-1),candle(1715088660000,180)]}]}
]},permission);
assert.deepEqual(invalid.drawingSets.map(s=>s.context),['tiingo_byo|AAPL','alpaca_byo|QQQ']);
assert.equal(invalid.drawingSets[1].drawings[0].points.length,1);
assert.equal(invalid.drawingSets[1].drawings[0].points[0].value,180);
const legacy=normalizeWorkspace({selected:'ADVANCED',
 drawings:[level(100)],drawingContext:'tiingo_byo|NVDA'},permission);
assert.deepEqual(legacy.drawings,[level(100)]);
assert.equal(legacy.drawingContext,'tiingo_byo|NVDA');
assert.deepEqual(legacy.drawingSets,[],'Legacy workspaces remain readable');
const unprivileged=normalizeWorkspace({selected:'PROFESSIONAL',layout:'STACKED',
 drawingSets:groups}, {tier:'STANDARD',allowed:['STANDARD']});
assert.equal(unprivileged.selected,'STANDARD');
assert.equal(unprivileged.layout,'SIDE_BY_SIDE');
assert.equal(unprivileged.drawingSets.length,2,
 'Access downgrade should not destroy privately saved research');
const many=normalizeWorkspace({selected:'PROFESSIONAL',
 drawingSets:Array.from({length:15},(_,i)=>({context:'csv_upload|SYMBOL_'+i,drawings:[level(100+i)]}))},permission);
assert.equal(many.drawingSets.length,10,'Source count must be bounded');
console.log('PASS Studio V7: multiple source-scoped drawing sets, normalization, legacy compatibility, downgrade preservation, rejected markup and bounded inputs');
