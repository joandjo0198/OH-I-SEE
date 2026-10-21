from pathlib import Path
import sys,subprocess,json
sys.path.insert(0,'output/media-tools')
import imageio_ffmpeg,cv2
ff=imageio_ffmpeg.get_ffmpeg_exe();results=[]
for name in ['supplied-hero.mp4','supplied-hero.webm']:
 p=Path('frontend/public/videos')/name
 subprocess.run([ff,'-v','error','-i',str(p),'-f','null','-'],check=True)
 cap=cv2.VideoCapture(str(p));fps=cap.get(cv2.CAP_PROP_FPS);frames=cap.get(cv2.CAP_PROP_FRAME_COUNT)
 assert int(frames)==300,(name,frames)
 r={'file':name,'width':int(cap.get(3)),'height':int(cap.get(4)),'fps':fps,'frames':int(frames),'duration':frames/fps,'megabytes':round(p.stat().st_size/1e6,2),'averageMbps':round(p.stat().st_size*8/(frames/fps)/1e6,2)}
 for frame in [0,150,299]:
  cap.set(cv2.CAP_PROP_POS_FRAMES,frame);ok,img=cap.read();assert ok
  if name.endswith('mp4'):cv2.imwrite(f'output/supplied-export-{frame}.jpg',img)
 cap.release();results.append(r)
Path('output/supplied-export-verification.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
