from pathlib import Path
import sys,json,subprocess
import cv2,numpy as np
sys.path.insert(0,'output/media-tools')
import imageio_ffmpeg
out=Path('output/hero-loop-frames');out.mkdir(exist_ok=True)
public=Path('frontend/public/videos');W,H=1882,836
source=cv2.imread('output/hero-sequence-source/ezgif-frame-150.jpg')
template=cv2.cvtColor(source[438:460,940:1058],cv2.COLOR_BGR2GRAY)
poster=cv2.imread('frontend/public/images/home-design/hero-background-clean.png')
# Match the reference's wide framing, with enough height for its complete residence.
poster=cv2.resize(poster,(W,H),interpolation=cv2.INTER_LANCZOS4)
cv2.imwrite(str(public/'hero-poster.png'),poster)
base=np.full((H,W,3),(28,21,12),np.uint8)
# Opaque text safe zone; a gradual feather prevents a hard video edge.
a=np.clip((np.arange(W)-W*.42)/(W*.14),0,1)[None,:,None].astype(np.float32)
prev_original=None;prev_clean=None;corrected=[]
first=None;last=None;count=0
for i in range(1,261):
 im=cv2.imread(f'output/hero-retouched/ezgif-frame-{i:03}.png')
 raw=cv2.imread(f'output/hero-sequence-source/ezgif-frame-{i:03}.jpg')
 # Stabilize the repaired patch with optical-flow-aligned preceding information.
 box=(slice(550,650),slice(1105,1210));now=raw[box];clean=im[box].copy()
 if prev_original is not None:
  flow=cv2.calcOpticalFlowFarneback(cv2.cvtColor(now,cv2.COLOR_BGR2GRAY),cv2.cvtColor(prev_original,cv2.COLOR_BGR2GRAY),None,.5,3,15,3,5,1.2,0)
  yy,xx=np.mgrid[:100,:105].astype(np.float32)
  warped=cv2.remap(prev_clean,xx+flow[:,:,0],yy+flow[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
  changed=np.any(clean!=now,axis=2)
  clean[changed]=cv2.addWeighted(clean,.8,warped,.2,0)[changed]
 im[box]=clean;prev_original=now.copy();prev_clean=clean.copy()
 search=cv2.cvtColor(raw[390:570,890:1160],cv2.COLOR_BGR2GRAY)
 score=cv2.matchTemplate(search,template,cv2.TM_CCOEFF_NORMED)
 _,value,_,point=cv2.minMaxLoc(score)
 if value>.57:
  x,y=point[0]+890,point[1]+390
  mask=np.zeros(im.shape[:2],np.uint8);mask[y:y+20,x:x+118]=255
  im=cv2.inpaint(im,mask,4,cv2.INPAINT_TELEA)
  cv2.putText(im,'PLUMBING',(x+2,y+16),cv2.FONT_HERSHEY_SIMPLEX,.48,(232,237,238),1,cv2.LINE_AA)
  corrected.append(i)
 scaled=cv2.resize(im,(1486,H),interpolation=cv2.INTER_LANCZOS4)
 canvas=base.copy();canvas[:,W-1486:]=scaled
 canvas=(canvas.astype(np.float32)*a+base.astype(np.float32)*(1-a)).astype(np.uint8)
 count+=1;cv2.imwrite(str(out/f'{count:04}.png'),canvas)
 if first is None:first=canvas.copy()
 last=canvas.copy()
# Clean finished-house hold replaces the ghosted UI tail. Exact first-frame endpoint avoids a cut.
for t in np.linspace(0,1,13)[1:]:
 count+=1;cv2.imwrite(str(out/f'{count:04}.png'),cv2.addWeighted(last,1-t,poster,t,0))
for _ in range(10):
 count+=1;cv2.imwrite(str(out/f'{count:04}.png'),poster)
for t in np.linspace(0,1,13)[1:]:
 count+=1;cv2.imwrite(str(out/f'{count:04}.png'),cv2.addWeighted(poster,1-t,first,t,0))
ff=imageio_ffmpeg.get_ffmpeg_exe()
common=[ff,'-y','-loglevel','error','-framerate','30','-i',str(out/'%04d.png'),'-an']
subprocess.run(common+['-c:v','libx264','-preset','slow','-crf','22','-maxrate','5M','-bufsize','10M','-pix_fmt','yuv420p','-movflags','+faststart',str(public/'hero-animation.mp4')],check=True)
subprocess.run(common+['-c:v','libvpx-vp9','-crf','32','-b:v','0','-row-mt','1','-cpu-used','4','-pix_fmt','yuv420p',str(public/'hero-animation.webm')],check=True)
report={'frames':count,'fps':30,'size':[W,H],'sourceFramesUsed':[1,260],'trimmed':[261,300],'correctedLabelFrames':corrected,'loopEndpointIdentical':bool(np.array_equal(first,cv2.imread(str(out/f'{count:04}.png'))))}
Path('output/hero-loop-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'frames':count,'labelCorrections':len(corrected),'loopEndpointIdentical':report['loopEndpointIdentical']}))
