'use strict';
const rules = require('./rules/tnbc');
const habitable = new Set(['bedroom','guest','living','dining','drawing','office']);
function minimum(type) { return rules.minima[habitable.has(type)?'habitable':type] || rules.minima.other; }
module.exports = {minimum, habitable};
