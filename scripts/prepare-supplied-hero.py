from pathlib import Path
import sys, subprocess, json
sys.path.insert(0,'output/sr-tools')
import cv2, numpy as np
cv2.setNumThreads(4)
sys.path.insert(0,'output/media-tools')
import imageio_ffmpeg
src=next(Path('C:/Users/Andrew paul/Downloads').glob('Architectural_exploded_view_anim*online-video-cutter.com*.mp4'))
cap=cv2.VideoCapture(str(src)); ok,first=cap.read(); assert ok
sr=cv2.dnn_superres.DnnSuperResImpl_create();sr.readModel('output/sr-models/FSRCNN_x3.pb');sr.setModel('fsrcnn',3)
# Fixed source interface is not part of the architectural animation.
mask=np.zeros(first.shape[:2],np.uint8)
for x1,y1,x2,y2 in [(0,160,272,197),(0,298,360,364),(0,377,480,398),(0,420,506,469),(0,484,442,608),(0,618,602,720)]:mask[y1:y2,x1:x2]=255
cap.set(cv2.CAP_PROP_POS_FRAMES,150); _, middle=cap.read()
label_templates=[(cv2.cvtColor(middle[473:486,904:970],cv2.COLOR_BGR2GRAY),'DETAIL 01'),(cv2.cvtColor(middle[560:573,978:1031],cv2.COLOR_BGR2GRAY),'DETAIL 02')]
roi=first[219:289,:762]; hsv=cv2.cvtColor(roi,cv2.COLOR_BGR2HSV)
mask[219:289,:762]=cv2.inRange(hsv,np.array([0,0,155]),np.array([180,95,255]))
mask=cv2.dilate(mask,np.ones((5,5),np.uint8))
# The fully opaque copy panel hides these pixels; avoid costly invisible repairs.
mask[:,:285]=0
out=Path('output/supplied-hero-frames');out.mkdir(exist_ok=True)
public=Path('frontend/public/videos'); W,H=2560,1152
# Keep all vertical architectural content after removing the baked navigation.
# Right-align an undistorted frame; feather its left side into the live copy area.
rw=round(1280*H/656); left=W-rw
alpha=np.clip((np.arange(W)-W*.32)/(W*.38),0,1)
alpha=(alpha*alpha*(3-2*alpha))[None,:,None].astype(np.float32)
base=np.full((H,W,3),(25,17,10),np.uint8)
def prepare(im):
 im=im.copy()
 for template,text in label_templates:
  region=cv2.cvtColor(im[380:650,850:1160],cv2.COLOR_BGR2GRAY)
  _,score,_,pt=cv2.minMaxLoc(cv2.matchTemplate(region,template,cv2.TM_CCOEFF_NORMED))
  if score>.66:
   x,y=850+pt[0],380+pt[1];h,w=template.shape
   cv2.rectangle(im,(x-2,y-2),(x+max(w,83),y+h+2),(20,24,28),-1)
   cv2.putText(im,text,(x,y+h-1),cv2.FONT_HERSHEY_SIMPLEX,.36,(239,242,242),1,cv2.LINE_AA)
 clean=cv2.inpaint(im,mask,5,cv2.INPAINT_TELEA)[64:]
 high=sr.upsample(clean)
 scaled=cv2.resize(high,(rw,H),interpolation=cv2.INTER_AREA)
 canvas=base.copy();canvas[:,left:]=scaled
 return (canvas.astype(np.float32)*alpha+base.astype(np.float32)*(1-alpha)).astype(np.uint8)
if '--preview' in sys.argv:
 for i in [0,150,299]:
  cap.set(cv2.CAP_PROP_POS_FRAMES,i);ok,im=cap.read()
  if ok:cv2.imwrite(f'output/supplied-hero-preview-{i}.jpg',prepare(im))
 sys.exit()
cap.set(cv2.CAP_PROP_POS_FRAMES,0)
for i in range(300):
 ok,im=cap.read()
 if not ok:break
 if (out/f'{i+1:04}.png').exists():continue
 canvas=prepare(im);cv2.imwrite(str(out/f'{i+1:04}.png'),canvas)
 if i==0:cv2.imwrite(str(public/'supplied-hero-poster.png'),canvas)
 if i%30==0:print(f'Processed {i+1}/300 frames',flush=True)
cap.release()
ff=imageio_ffmpeg.get_ffmpeg_exe()
common=[ff,'-y','-loglevel','error','-framerate','30','-i',str(out/'%04d.png'),'-an']
subprocess.run(common+['-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(public/'supplied-hero.mp4')],check=True)
subprocess.run(common+['-c:v','libvpx-vp9','-crf','24','-b:v','0','-row-mt','1','-cpu-used','4','-pix_fmt','yuv420p',str(public/'supplied-hero.webm')],check=True)
Path('output/supplied-hero-report.json').write_text(json.dumps({'source':str(src),'sourceDimensions':[1280,720],'outputDimensions':[W,H],'fps':30,'frames':i+1,'upscaler':'FSRCNN x3, area resample','h264CRF':17,'vp9CRF':24,'changes':'Removed baked navigation; repaired embedded copy/buttons, dark feather under live copy; preserved source aspect ratio'},indent=2))
print('Exports complete',flush=True)
