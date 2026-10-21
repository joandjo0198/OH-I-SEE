"""Bounded local drawing analysis. All results are unverified editing candidates.

Input bytes arrive in a private temporary directory. No user content is executed
or sent to an AI provider. Stdout contains one JSON object; OCR logs use stderr.
"""
import base64
import contextlib
import json
import math
import re
import sys
from pathlib import Path
import cv2
import numpy as np


def load_image(path, page):
    data = Path(path).read_bytes()
    if data.startswith(b'%PDF-'):
        import pymupdf
        with pymupdf.open(stream=data, filetype='pdf') as doc:
            if doc.needs_pass:
                raise ValueError('Password-protected PDFs are not supported.')
            if page < 1 or page > len(doc):
                raise ValueError('Choose an existing PDF page.')
            p = doc[page - 1]
            zoom = min(2.5, 2000 / max(p.rect.width, p.rect.height))
            pix = p.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
            image = cv2.cvtColor(np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, 3), cv2.COLOR_RGB2BGR)
    else:
        # Check dimensions before decoding (protect against decompression bombs).
        from PIL import Image
        with Image.open(path) as pil:
            if pil.width * pil.height > 24_000_000:
                raise ValueError('Image is too large. Resize to fewer than 24 million pixels.')
        image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('Cannot read this drawing. Use PNG, JPEG or PDF.')
    scale = min(3, 1800 / max(image.shape[:2]))
    return cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)


def feet_dimension(text):
    text = text.upper().replace('′', "'").replace('’', "'").replace('″', '"').replace('×', 'X')
    text = text.replace('X.', 'X').replace('°', '"')
    pattern = r'(\d{1,3})(?:\s*[\'’]\s*(\d{1,2})?\s*["”]?)\s*[Xx*]\s*(\d{1,3})(?:\s*[\'’]\s*(\d{1,2})?\s*["”]?)?'
    m = re.search(pattern, text)
    if m:
        a, b, c, d = m.groups()
        return float(a) + float(b or 0) / 12, float(c) + float(d or 0) / 12
    return None


def analyze(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 8, 7, 21)
    _, threshold = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    lines = cv2.HoughLinesP(threshold, 1, np.pi / 1800, 100, minLineLength=image.shape[1] // 4, maxLineGap=12)
    angles = []
    if lines is not None:
        for x1, y1, x2, y2 in lines.reshape(-1, 4):
            a = math.degrees(math.atan2(y2-y1, x2-x1))
            a = (a + 45) % 90 - 45
            if abs(a) < 8:
                angles.append(a)
    skew = float(np.median(angles)) if angles else 0
    if abs(skew) > .15:
        matrix = cv2.getRotationMatrix2D((image.shape[1]/2, image.shape[0]/2), skew, 1)
        image = cv2.warpAffine(image, matrix, (image.shape[1], image.shape[0]), borderValue=(255,255,255))
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, threshold = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    blue = cv2.inRange(hsv, (90, 100, 40), (140, 255, 255))
    colored = cv2.countNonZero(blue) > image.shape[0] * image.shape[1] * .004
    mask = blue if colored else cv2.morphologyEx(threshold, cv2.MORPH_OPEN, np.ones((3,3), np.uint8))
    length = max(12, image.shape[1] // 35)
    horizontal = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((1,length), np.uint8))
    vertical = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((length,1), np.uint8))
    # Close door gaps along line direction; retain the original mask for openings.
    gap = max(12, image.shape[1] // 12)
    horizontal = cv2.morphologyEx(horizontal, cv2.MORPH_CLOSE, np.ones((1,gap), np.uint8))
    vertical = cv2.morphologyEx(vertical, cv2.MORPH_CLOSE, np.ones((gap,1), np.uint8))
    walls = cv2.bitwise_or(horizontal, vertical)
    walls = cv2.dilate(walls, np.ones((3,3), np.uint8))
    from rapidocr import RapidOCR
    with contextlib.redirect_stdout(sys.stderr):
        engine = RapidOCR(params={'Global.text_score': .35})
        result = engine(image)
    ocr = []
    if result.boxes is not None:
        for box, text, score in zip(result.boxes, result.txts, result.scores):
            ocr.append({'text':text, 'confidence':round(float(score),3), 'box':np.asarray(box).round(1).tolist()})
    count, labels, stats, _ = cv2.connectedComponentsWithStats(255-walls)
    spaces=[]
    H,W = image.shape[:2]
    for x,y,w,h,area in stats[1:]:
        if x<=1 or y<=1 or x+w>=W-1 or y+h>=H-1 or area<W*H*.003 or w<20 or h<20 or area/(w*h)<.65:
            continue
        texts=[t for t in ocr if x<=np.mean(np.array(t['box'])[:,0])<=x+w and y<=np.mean(np.array(t['box'])[:,1])<=y+h]
        combined=' '.join(t['text'] for t in texts)
        if not re.search(r'BED|KITCH|DIN|LIV|DRAW|PUJA|POOJA|TOILET|TOILT|DRESS|PASS|BATH|SITOUT',combined,re.I):
            continue
        dims=feet_dimension(combined)
        spaces.append({'x':int(x),'y':int(y),'w':int(w),'h':int(h),'text':combined,'dimensions':dims})
    # Door and window gaps can leave rooms connected to the outside. For each
    # dimension label, intersect rays with the observed horizontal/vertical walls.
    # This finds candidate room bounds without assuming a fully closed contour.
    axis_lines = {'h': [], 'v': []}
    for axis, mat in [('h', horizontal), ('v', vertical)]:
        contours, _ = cv2.findContours(mat, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if (w if axis == 'h' else h) < length:
                continue
            axis_lines[axis].append((y+h/2, x, x+w) if axis == 'h' else (x+w/2, y, y+h))
    for t in ocr:
        dims = feet_dimension(t['text'])
        if not dims:
            continue
        cx, cy = np.mean(np.array(t['box']), axis=0)
        if any(s['x'] <= cx <= s['x']+s['w'] and s['y'] <= cy <= s['y']+s['h'] for s in spaces):
            continue
        hs = [at for at, start, end in axis_lines['h'] if start-8 <= cx <= end+8]
        vs = [at for at, start, end in axis_lines['v'] if start-8 <= cy <= end+8]
        top = max((v for v in hs if v < cy), default=None)
        bottom = min((v for v in hs if v > cy), default=None)
        left = max((v for v in vs if v < cx), default=None)
        right = min((v for v in vs if v > cx), default=None)
        if None in (top, bottom, left, right) or right-left < 20 or bottom-top < 20:
            continue
        texts = [item['text'] for item in ocr if left <= np.mean(np.array(item['box'])[:,0]) <= right and top <= np.mean(np.array(item['box'])[:,1]) <= bottom]
        combined = ' '.join(texts)
        if not re.search(r'BED|KITCH|DIN|LIV|DRAW|PUJA|POOJA|TOILET|TOILT|TOELET|DRESS|PASS|BATH|SITOUT', combined, re.I):
            continue
        # Candidate bounds must not duplicate or engulf already found spaces.
        if any(min(right,s['x']+s['w'])-max(left,s['x']) > min(right-left,s['w'])*.7 and min(bottom,s['y']+s['h'])-max(top,s['y']) > min(bottom-top,s['h'])*.7 for s in spaces):
            continue
        spaces.append({'x':float(left),'y':float(top),'w':float(right-left),'h':float(bottom-top),'text':combined,'dimensions':dims})
    # Room OCR estimates scale; discrepancies remain visible, never silently exact.
    candidates=[]
    for s in spaces:
        if s['dimensions']:
            a,b=s['dimensions']
            if a>2 and b>2 and .75 < (s['w']/a)/(s['h']/b) < 1.33:
                candidates.extend([s['w']/a,s['h']/b])
    scale=float(np.median(candidates)) if candidates else None
    warnings=['Detected geometry is approximate. Check every room, wall and opening against the source before conversion.',
              'Drawing margins are included in the detected plot. Set the actual plot boundary and setbacks in JSON.',
              'Opening labels are candidates only; arcs and unlabelled openings may need manual correction.']
    if scale:
        scale_note=f'Estimated scale: {scale:.2f} pixels/ft from room dimension OCR. Verify before use.'
    else:
        scale=W/40
        scale_note='No reliable scale found. The draft uses an arbitrary 40 ft image width. Calibrate before conversion.'
        warnings.append(scale_note)
    all_text=' '.join(t['text'] for t in ocr).upper()
    facing=next((d.title() for d in ['EAST','WEST','NORTH','SOUTH'] if d+' FACING' in all_text),'East')
    if not any(d+' FACING' in all_text for d in ['EAST','WEST','NORTH','SOUTH']):warnings.append('Facing was not read; East is a placeholder. Correct it before conversion.')
    rooms=[]
    types=[('BED','bedroom'),('KITCH','kitchen'),('DRESS','dressing'),('DIN','dining'),('LIV','living'),('DRAW','drawing'),('PUJA','puja'),('POOJA','puja'),('TOIL','bathroom'),('TOELET','bathroom'),('BATH','bathroom'),('PASS','corridor'),('SITOUT','porch')]
    # Keep individual dimension labels separate even when gaps merged several
    # rooms. Use nominal OCR dimensions with positions anchored to nearby walls.
    # This is intentionally reported as an editable hypothesis, never as truth.
    proposals=[]
    labels=[t for t in ocr if re.search(r'BED|MASTER|KID|KITCH|DINING|LIVING|DRAWING|PUJA|POOJA|TOIL|TOELET|DRESS|PASS|BATH|SITOUT',t['text'],re.I)]
    for t in ocr:
        dims=feet_dimension(t['text'])
        if not dims or min(dims)<2 or max(dims)>100:
            continue
        cx,cy=np.mean(np.array(t['box']),axis=0)
        close=[]
        for label in labels:
            lx,ly=np.mean(np.array(label['box']),axis=0)
            if abs(lx-cx)<max(60,dims[0]*scale*.45) and -scale*2<cy-ly<scale*5:
                close.append((abs(lx-cx)+abs(cy-ly)*.7,label['text']))
        if not close:
            continue
        close.sort();name=close[0][1]
        if 'BEDROOM' in name.upper():
            prefix=next((text for _,text in close if re.search('MASTER|KID',text,re.I)),None)
            if prefix:name=prefix+' '+name
        rw,rh=dims[0]*scale,dims[1]*scale
        hs=[at for at,start,end in axis_lines['h'] if start-8<=cx<=end+8]
        vs=[at for at,start,end in axis_lines['v'] if start-scale*1.5<=cy<=end+scale*1.5]
        left=max((v for v in vs if v<cx),default=cx-rw/2)
        right=min((v for v in vs if v>cx),default=left+rw)
        top=max((v for v in hs if v<cy),default=cy-rh*.6)
        bottom=min((v for v in hs if v>cy),default=top+rh)
        x=left if cx-left<rw*.9 else right-rw
        y=top if cy-top<rh*.9 else bottom-rh
        # Do not shift outside the uploaded image.
        x=max(0,min(W-rw,x));y=max(0,min(H-rh,y))
        if not any(abs(x-s['x'])<scale and abs(y-s['y'])<scale for s in proposals):
            proposals.append({'x':x,'y':y,'w':rw,'h':rh,'text':name,'dimensions':dims})
    if proposals:
        spaces=proposals
        warnings.append('Room sizes use OCR text; positions use nearby wall lines. OCR can misread dimensions. Resolve overlaps and missing rooms in the editor.')
    for i,s in enumerate(spaces[:80]):
        kind=next((kind for word,kind in types if word in s['text'].upper()),'room')
        words=re.findall(r'[A-Za-z]+',s['text'])
        names=[word for word in words if word.upper() not in ['D','D1','V','W','W1','X','MD','PD','SW','NW','NE','SE','N','S','E']]
        name=' '.join(names).strip() or kind.title()
        rooms.append({'id':f'detected-{i}','name':name[:100],'type':kind,'x':round(s['x']/scale,3),'y':round(s['y']/scale,3),'width':round(s['w']/scale,3),'depth':round(s['h']/scale,3),'ocrDimensions':s['dimensions'],'confidence':'unverified'})
    preview=cv2.imencode('.jpg',image,[cv2.IMWRITE_JPEG_QUALITY,80])[1].tobytes()
    plan={'schemaVersion':1,'title':'Detected Floor Plan','units':'ft','source':'upload','plot':{'width':round(W/scale,3),'depth':round(H/scale,3),'facing':facing,'roadSide':'front','setbacks':{'front':0,'rear':0,'left':0,'right':0}},'settings':{'externalWall':.75,'internalWall':.375,'wallHeight':10,'doorHeight':7,'windowSill':3,'windowHeight':4},'rooms':rooms,'walls':[],'openings':[],'warnings':warnings,'reviewed':False,'detection':{'pixelsPerFoot':scale,'scaleVerified':False,'deskewDegrees':skew,'blueWalls':colored}}
    # Return observed line segments as evidence for the editor.
    segments=[]
    for axis,mat in [('h',horizontal),('v',vertical)]:
        contours,_=cv2.findContours(mat,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            x,y,w,h=cv2.boundingRect(contour)
            if (w if axis=='h' else h)<length:continue
            segments.append({'axis':axis,'at':round((y+h/2 if axis=='h' else x+w/2)/scale,3),'start':round((x if axis=='h' else y)/scale,3),'end':round((x+w if axis=='h' else y+h)/scale,3)})
    return {'plan':plan if rooms else None,'ocr':ocr,'wallCandidates':segments[:600],'scaleNote':scale_note,'message':'No reliably enclosed, labelled rooms detected. Try a clearer drawing or build a plan with the form.','preview':'data:image/jpeg;base64,'+base64.b64encode(preview).decode()}


if __name__ == '__main__':
    try:
        cv2.setNumThreads(2)
        result=analyze(load_image(sys.argv[1],int(sys.argv[2]) if len(sys.argv)>2 else 1))
        print(json.dumps(result,ensure_ascii=True))
    except Exception as exc:
        print(json.dumps({'error':str(exc)}))
        sys.exit(1)
