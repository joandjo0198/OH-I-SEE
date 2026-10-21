"""Original roof motion, a pipe-flow demonstration, then a finished-home hold.

Crop the far-right watermark-bearing parking edge instead of smearing pixels.
Draw service highlights only during the stationary exploded-view demonstration.
"""
from pathlib import Path
import json
import subprocess
import sys
import cv2
import numpy as np
sys.path.insert(0, 'output/media-tools')
import imageio_ffmpeg

FPS = 24
WIDTH, HEIGHT, CROP_RIGHT, PAD = 2190, 984, 1660, 530
source = next(p for p in Path('C:/Users/Andrew paul/Downloads').glob('Architectural_exploded_view_anim*.mp4') if 'cutter' not in p.name)
dest = Path('frontend/public/videos')
cap = cv2.VideoCapture(str(source))
frames = {}
cap.set(cv2.CAP_PROP_POS_FRAMES, 150)
for index in range(150, 211):
    ok, frame = cap.read()
    if not ok:
        raise RuntimeError(f'Missing original frame {index}')
    canvas = np.full((HEIGHT, WIDTH, 3), (25, 17, 10), np.uint8)
    canvas[:, PAD:] = frame[96:1080, :CROP_RIGHT]
    frames[index] = canvas
cap.release()

# Coordinates follow the actual exposed pipe runs in original frame 150.
paths = [
    ([(945, 663), (1180, 641), (1193, 642), (1207, 650), (1210, 839)], (255, 195, 80)),
    ([(950, 670), (1190, 649), (1218, 657), (1219, 839)], (100, 130, 255)),
    ([(821, 623), (820, 646), (830, 654), (1007, 689), (1174, 683), (1176, 676)], (110, 235, 255)),
]

def sample_path(points):
    points = np.array(points, dtype=np.float32)
    lengths = np.linalg.norm(np.diff(points, axis=0), axis=1)
    distance = np.r_[0, np.cumsum(lengths)]
    t = np.arange(0, distance[-1], 1)
    return np.column_stack([np.interp(t, distance, points[:, axis]) for axis in (0, 1)])

sampled = [(sample_path(points), color) for points, color in paths]

def flow(frame, tick):
    overlay = frame.copy()
    for number, (points, color) in enumerate(sampled):
        # Several short moving packets make the direction clear.
        position = (tick * 5 + number * 45) % 150
        for offset in range(-150, len(points) + 150, 150):
            start = int(offset + position)
            segment = points[max(0, start):min(len(points), start + 38)].copy()
            if start + 38 <= 0 or start >= len(points) or len(segment) < 2:
                continue
            segment[:, 0] += PAD
            segment[:, 1] -= 96
            contour = np.round(segment).astype(np.int32)
            cv2.polylines(overlay, [contour], False, color, 5, cv2.LINE_AA)
            cv2.polylines(overlay, [contour], False, (245, 250, 255), 2, cv2.LINE_AA)
    opacity = min(1, tick / 10, (95 - tick) / 10)
    return cv2.addWeighted(overlay, max(0, opacity), frame, 1 - max(0, opacity), 0)

timeline = [(210, None)] * 24
timeline += [(index, None) for index in range(210, 149, -1)]
timeline += [(150, tick) for tick in range(96)]
timeline += [(index, None) for index in range(150, 211)]
timeline += [(210, None)] * 96
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
output = dest / 'home-roof-pipeline.mp4'
process = subprocess.Popen([ffmpeg, '-y', '-loglevel', 'error', '-f', 'rawvideo',
    '-pix_fmt', 'bgr24', '-s', f'{WIDTH}x{HEIGHT}', '-r', str(FPS), '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)], stdin=subprocess.PIPE)
try:
    for index, tick in timeline:
        frame = frames[index] if tick is None else flow(frames[index], tick)
        process.stdin.write(frame.tobytes())
finally:
    process.stdin.close()
if process.wait() != 0:
    raise RuntimeError('Video encoding failed')
cv2.imwrite(str(dest / 'home-roof-pipeline-poster.png'), frames[210])
cv2.imwrite('output/pipeline-flow-verification.jpg', flow(frames[150], 36))
report = {'source': str(source), 'frames': len(timeline), 'fps': FPS,
          'duration': len(timeline) / FPS, 'cropRight': CROP_RIGHT,
          'stages': ['finished home', 'original roof opening', 'pipe flow for 4 seconds',
                     'original roof closing', 'finished home for 4 seconds'],
          'blurOrInpaintApplied': False}
Path('output/hero-pipeline-report.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
