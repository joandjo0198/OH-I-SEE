from pathlib import Path
import cv2
import numpy as np
src=Path('output/hero-sequence-source'); dest=Path('output/hero-retouched')
mask=np.zeros((720,1280),np.uint8)
# Fixed mask encloses the sparkle and its compression halo without cropping.
cv2.fillPoly(mask,[np.array([[1159,568],[1172,587],[1191,600],[1173,612],[1159,634],[1146,613],[1127,601],[1146,586]],np.int32)],255)
mask=cv2.dilate(mask,np.ones((5,5),np.uint8))
writer=cv2.VideoWriter('frontend/public/videos/house-construction.webm',cv2.VideoWriter_fourcc(*'VP80'),30,(1280,720))
if not writer.isOpened(): raise RuntimeError('WebM encoder unavailable')
count=0
for p in sorted(src.glob('ezgif-frame-*.jpg')):
 im=cv2.imread(str(p)); assert im.shape[:2]==(720,1280)
 clean=cv2.inpaint(im,mask,5,cv2.INPAINT_TELEA)
 assert np.array_equal(clean[mask==0],im[mask==0])
 cv2.imwrite(str(dest/(p.stem+'.png')),clean)
 # End before the source video introduces baked-in website navigation/text.
 if count<260: writer.write(clean)
 count+=1
writer.release()
print(f'Retouched {count} full-size frames; unmasked pixels unchanged. Encoded first 260 frames at 30 fps.')
