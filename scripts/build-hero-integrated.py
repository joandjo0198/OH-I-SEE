"""Full-width original motion with a tracked car repair and attached pipe flow."""
from pathlib import Path
import sys, subprocess, json
import cv2
import numpy as np
sys.path.insert(0, 'output/media-tools')
import imageio_ffmpeg
cv2.setNumThreads(4)
source = next(p for p in Path('C:/Users/Andrew paul/Downloads').glob('Architectural_exploded_view_anim*.mp4') if 'cutter' not in p.name)
dest = Path('frontend/public/videos')
cap = cv2.VideoCapture(str(source))
cap.set(cv2.CAP_PROP_POS_FRAMES, 150)
frames = {}
for i in range(150, 211):
    ok, frame = cap.read()
    assert ok, i
    frames[i] = frame
cap.release()
reference = frames[150]
gray = cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY)
repair = cv2.resize(cv2.imread('output/car-restored-keyframe.png'), (1920, 1080), interpolation=cv2.INTER_LANCZOS4)
# Track the car, excluding the superimposed mark from feature detection.
feature_mask = np.zeros(gray.shape, np.uint8)
feature_mask[824:1000, 1670:1918] = 255
feature_mask[850:955, 1690:1795] = 0
features = cv2.goodFeaturesToTrack(gray, 100, .01, 6, mask=feature_mask)
yy, xx = np.mgrid[:1080, :1920]
mask = np.minimum.reduce([(xx-1662)/16, (1928-xx)/16, (yy-814)/16, (1008-yy)/16])
mask = np.clip(mask, 0, 1).astype(np.float32)
mask = mask * mask * (3-2*mask)
paths = [
    ([(945,663),(1180,641),(1193,642),(1207,650),(1210,839)], (255,190,75)),
    ([(950,670),(1190,649),(1218,657),(1219,839)], (95,130,255)),
    ([(821,623),(820,646),(830,654),(1007,689),(1174,683),(1176,676)], (100,235,255))]
def sample(points):
    points=np.array(points,np.float32)
    lengths=np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))]
    t=np.arange(0,lengths[-1],2)
    return np.column_stack([np.interp(t,lengths,points[:,axis]) for axis in (0,1)]).astype(np.float32)
sampled=[(sample(p),c) for p,c in paths]
tracked={}
repaired={}
report=[]
for i, frame in frames.items():
    current=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
    target,good,_=cv2.calcOpticalFlowPyrLK(gray,current,features,None,winSize=(31,31),maxLevel=4)
    valid=good.ravel()==1
    matrix,inliers=cv2.estimateAffinePartial2D(features[valid],target[valid],method=cv2.RANSAC,ransacReprojThreshold=3)
    assert matrix is not None and inliers.sum()>=8, f'Car tracking failed at {i}'
    restored=cv2.warpAffine(repair,matrix,(1920,1080))
    alpha=cv2.warpAffine(mask,matrix,(1920,1080))[:,:,None]
    repaired[i]=np.clip(restored*alpha+frame*(1-alpha),0,255).astype(np.uint8)
    report.append({'frame':i,'carInliers':int(inliers.sum())})
    tracked[i]=[]
    if i>=183:
        continue
    for points,color in sampled:
        moved,status,_=cv2.calcOpticalFlowPyrLK(gray,current,points.reshape(-1,1,2),None,winSize=(21,21),maxLevel=3)
        moved=moved.reshape(-1,2)
        delta=moved-points
        valid=(status.ravel()==1)&(np.linalg.norm(delta,axis=1)<35)
        assert valid.sum()>10, f'Pipe tracking failed at {i}'
        # Robust translation prevents a low-texture point from jumping to a tree
        # or column and stretching a highlight away from its physical pipe.
        shift=np.median(delta[valid],axis=0)
        tracked[i].append((points+shift,color))

def render(index,tick):
    frame=repaired[index].copy()
    # Flow fades as walls close; it follows the source pipes while the roof moves.
    strength=float(np.clip((183-index)/15,0,1))
    if strength:
        overlay=frame.copy()
        for number,(points,color) in enumerate(tracked[index]):
            phase=(tick*2.8+number*22)%75
            for offset in range(-75,len(points)+75,75):
                start=int(offset+phase)
                if start+15<=0 or start>=len(points): continue
                line=np.round(points[max(0,start):min(len(points),start+15)]).astype(np.int32)
                if len(line)>1:
                    cv2.polylines(overlay,[line],False,color,4,cv2.LINE_AA)
                    cv2.polylines(overlay,[line],False,(235,245,255),1,cv2.LINE_AA)
        frame=cv2.addWeighted(overlay,strength*.85,frame,1-strength*.85,0)
    canvas=np.full((1080,2400,3),(25,17,10),np.uint8)
    canvas[:,292:]=cv2.resize(frame[96:],(2108,1080),interpolation=cv2.INTER_LANCZOS4)
    return canvas

# One continuous opening/closing sequence; only the completed home holds.
timeline=list(range(210,149,-1))+list(range(151,211))+[210]*72
ff=imageio_ffmpeg.get_ffmpeg_exe()
raw=dest/'home-integrated-source.mp4'
proc=subprocess.Popen([ff,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s','2400x1080','-r','24','-i','-',
    '-an','-c:v','libx264','-crf','15','-preset','medium','-pix_fmt','yuv420p',str(raw)],stdin=subprocess.PIPE)
for tick,index in enumerate(timeline): proc.stdin.write(render(index,tick).tobytes())
proc.stdin.close()
assert proc.wait()==0
# Retain native 24 fps and sharp source frames rather than blend moving edges.
subprocess.run([ff,'-y','-loglevel','error','-i',str(raw),
    '-an','-c:v','copy','-movflags','+faststart',
    str(dest/'home-integrated-hd.mp4')],check=True)
cv2.imwrite(str(dest/'home-integrated-hd-poster.png'),render(210,0))
for i in [150,170,190,210]:cv2.imwrite(f'output/integrated-check-{i}.jpg',render(i,45))
Path('output/hero-integrated-report.json').write_text(json.dumps({'size':[2400,1080],'fps':24,'sourceFrames':[150,210],
    'fullCarPreserved':True,'pipeFlowDuringRoofMotion':True,'carTracking':report},indent=2))
print('Finished full-frame, integrated native 24 fps animation.')
