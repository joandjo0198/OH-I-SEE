'use strict';
const rules = require('./rules/tnbc');
function calculateStair(height = rules.floorHeight) {
  const risers=Math.ceil(height/rules.stair.maxRiser), first=Math.ceil(risers/2),second=risers-first;
  return {risers, riser:height/risers, treads:risers-1, flightRisers:[first,second], tread:rules.stair.minTread,
    width:rules.stair.width, landing:rules.stair.width, headroom:rules.stair.headroom, height,
    w:2*rules.stair.width+rules.wall.internal, h:(Math.max(first,second)-1)*rules.stair.minTread+2*rules.stair.width,
    note:'Full stairwell opening required above both flights; structural/headroom review required.'};
}
module.exports = {calculateStair};
