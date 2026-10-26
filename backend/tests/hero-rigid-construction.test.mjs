import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCENE,STAGES,constructionFrame,constructionSvg} from '../../frontend/js/hero-rigid-construction.mjs';

test('construction visibly progresses through ground floor, upper floor and roof',()=>{
  assert.equal(constructionFrame(2.9).layers[0].shade,.86);
  assert.equal(constructionFrame(6).layers[0].shade,0);
  assert.ok(constructionFrame(6).layers[1].shade>0);
  assert.ok(constructionFrame(8).layers[2].shade>0);
  assert.ok(constructionFrame(9.5).layers.every(l=>l.shade===0&&l.line===0));
});
test('reveals are continuous, monotonic and settle at each stage endpoint',()=>{
  for(const [i,stage] of STAGES.entries()){
    let last=.86;
    for(let j=0;j<=600;j++){const layer=constructionFrame(stage.start+(stage.end-stage.start)*j/600).layers[i];assert.ok(layer.shade<=last+1e-10);last=layer.shade;}
    assert.equal(last,0);
    assert.ok(Math.abs(constructionFrame(stage.start+.001).layers[i].shade-.86)<1e-6);
    assert.ok(constructionFrame(stage.end-.001).layers[i].shade<1e-6);
  }
});
test('loop joins on the same completed home without a frame or position jump',()=>{
  for(const time of [0,SCENE.duration-.001,SCENE.duration,SCENE.duration+.001])assert.ok(constructionFrame(time).layers.every(l=>l.shade===0&&l.line===0));
});
test('the scene has one fixed coordinate system and no vehicle overlap',()=>{
  const svg=constructionSvg();
  assert.match(svg,/viewBox="0 0 1920 954"/);
  assert.doesNotMatch(svg,/transform=|<animateTransform|<video/);
  for(const stage of STAGES)for(const pair of stage.points.split(' ')){const [x,y]=pair.split(',').map(Number);assert.ok(x<1600);assert.ok(y>=0&&y<=954);}
  const controller=readFileSync(new URL('../../frontend/js/hero-construction-film.js',import.meta.url),'utf8');
  assert.doesNotMatch(controller,/\.mp4|\.webm|\.playbackRate|\.style\.transform/);
  const page=readFileSync(new URL('../../frontend/pages/index.html',import.meta.url),'utf8');
  assert.doesNotMatch(page,/<video[^>]*hero-construction-film/);
});
