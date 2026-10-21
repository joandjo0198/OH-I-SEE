import * as T from 'three';
export function createEveningSky(resources){
 const geometry=new T.SphereGeometry(100,32,16);resources.push(geometry);
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
 vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec3 vDirection;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v;}
 void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.);vec3 sky=mix(vec3(.16,.22,.29),vec3(.028,.068,.12),pow(h,.45));
 vec2 uv=d.xz/(max(d.y,.035)+.16);float cloud=smoothstep(.43,.73,fbm(uv*2.4));float band=smoothstep(0.,.12,d.y)*(1.-smoothstep(.7,1.,d.y));
 sky=mix(sky,vec3(.28,.31,.35),cloud*band*.48);gl_FragColor=vec4(sky,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const sky=new T.Mesh(geometry,material);sky.name='Evening_sky';sky.renderOrder=-10;return sky;
}
