import sys,json,subprocess
from pathlib import Path
import cv2,numpy as np
sys.path.insert(0,'output/media-tools');import imageio_ffmpeg
root=Path('output/hero-sr-frames');public=Path('frontend/public/videos')
raw=cv2.imread('output/hero-sequence-source/ezgif-frame-150.jpg');tb=cv2.cvtColor(raw[438:460,940:1058],cv2.COLOR_BGR2GRAY)
raw=cv2.imread('output/hero-sequence-source/ezgif-frame-001.jpg');ta=cv2.cvtColor(raw[481:511,980:1108],cv2.COLOR_BGR2GRAY)
report=[]
for lo,hi,template in [(1,85,ta),(120,245,tb)]:
 anchors=[]
 for i in range(lo,hi+1):
  im=cv2.imread(f'output/hero-sequence-source/ezgif-frame-{i:03}.jpg');roi=cv2.cvtColor(im[390:650,890:1190],cv2.COLOR_BGR2GRAY)
  _,score,_,pos=cv2.minMaxLoc(cv2.matchTemplate(roi,template,cv2.TM_CCOEFF_NORMED))
  if score>.6:anchors.append((i,pos[0]+890,pos[1]+390))
 assert anchors,'Missing label anchors'
 for i in range(lo,hi+1):
  x=int(np.interp(i,[v[0] for v in anchors],[v[1] for v in anchors]));y=int(np.interp(i,[v[0] for v in anchors],[v[2] for v in anchors]))
  frame=cv2.imread(str(root/f'{i:04}.png'));left=768+round(x*2.4);top=round(y*2.4);width=round(template.shape[1]*2.4);height=round(template.shape[0]*2.4)
  mask=np.zeros(frame.shape[:2],np.uint8);mask[top:top+height,left:left+width]=255;frame=cv2.inpaint(frame,mask,5,cv2.INPAINT_TELEA)
  # Native-output lettering, away from frame edges, rather than upscaled glyphs.
  tx=min(left+4,3840-width-154);ty=top+round(height*.74)
  cv2.putText(frame,'PLUMBING',(tx,ty),cv2.FONT_HERSHEY_SIMPLEX,1.13,(235,239,240),2,cv2.LINE_AA)
  cv2.imwrite(str(root/f'{i:04}.png'),frame);report.append({'frame':i,'x':tx,'y':ty,'width':width})
# Rebuild return blend using the newly corrected first frame, keeping the exact loop endpoint.
poster=cv2.imread(str(public/'hero-poster.png'));first=cv2.imread(str(root/'0001.png'))
for k,t in enumerate(np.linspace(0,1,13)[1:],283):cv2.imwrite(str(root/f'{k:04}.png'),cv2.addWeighted(poster,1-t,first,t,0))
ff=imageio_ffmpeg.get_ffmpeg_exe();common=[ff,'-y','-loglevel','error','-framerate','30','-i',str(root/'%04d.png'),'-an']
for retina in [False,True]:
 suffix='-retina' if retina else '';sc=[] if retina else ['-vf','scale=2560:1152:flags=lanczos']
 for ext,args in [('mp4',['-c:v','libx264','-preset','slow','-crf','18','-movflags','+faststart']),('webm',['-c:v','libvpx-vp9','-crf','26','-b:v','0','-row-mt','1','-cpu-used','4'])]:
  subprocess.run(common+sc+args+['-pix_fmt','yuv420p',str(public/f'hero-animation{suffix}.{ext}')],check=True)
  print('Encoded',suffix or 'standard',ext,flush=True)
Path('output/hero-label-repair.json').write_text(json.dumps(report))
