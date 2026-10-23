const {test}=require('node:test');
const assert=require('node:assert/strict');
const {packExactRooms}=require('../src/bim/generation/layoutEngine');
test('small envelopes never expand to an artificial four metre footprint',()=>{
 const result=packExactRooms([{name:'Puja',lengthFt:5,widthFt:7}],{x:0,y:0,width:2,height:3},0.1143);
 assert.equal(result.ok,true);
 assert.ok(result.buildL<=2 && result.buildW<=3);
});
test('negative usable envelopes and malformed dimensions fail explicitly',()=>{
 assert.equal(packExactRooms([],{x:0,y:0,width:-1,height:3},0.1143).ok,false);
 assert.equal(packExactRooms([{name:'Dining',lengthFt:NaN,widthFt:8}],{x:0,y:0,width:5,height:5},0.1143).ok,false);
});
