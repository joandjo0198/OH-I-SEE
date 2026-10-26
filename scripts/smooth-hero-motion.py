"""Re-time the existing construction footage; retain its complete fixed frame.

Generate motion-compensated intermediate frames before applying a quintic ease
to the opening/closing motion. Do not slow a low-frame-rate video in the browser.
"""
from pathlib import Path
import json
import subprocess
import sys
import cv2
import numpy as np

sys.path.insert(0, 'output/media-tools')
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = Path('frontend/public/videos')
SOURCE = ROOT / 'home-static-camera-hd.mp4'
INTERMEDIATE = Path('output/hero-interpolated-120.mp4')
OPENING = Path('output/hero-eased-opening.mp4')
OUTPUT = ROOT / 'home-smooth-construction-v4.mp4'
FPS, W, H, MOVE_FRAMES = 60, 1920, 954, 270

def run(args):
    subprocess.run([FF, '-y', '-hide_banner', '-loglevel', 'error', *args], check=True)

if not INTERMEDIATE.exists():
    print('Interpolating original opening frames with motion compensation...', flush=True)
    run(['-i', str(SOURCE), '-vf',
         'trim=start_frame=0:end_frame=61,setpts=PTS-STARTPTS,scale=1920:954:flags=lanczos,'
         'hqdn3d=1:1:2:2,tpad=stop_mode=clone:stop_duration=0.2,'
         'minterpolate=fps=120:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none',
         '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', str(INTERMEDIATE)])

print('Applying zero-velocity / zero-acceleration endpoints...', flush=True)
cap = cv2.VideoCapture(str(INTERMEDIATE))
assert cap.isOpened()
# Motion interpolation drops its look-ahead frames at the tail. Use the last
# fully interpolated frame rather than seeking beyond the available stream.
last_index = min(300, int(cap.get(cv2.CAP_PROP_FRAME_COUNT))-1)
assert last_index >= 280
process = subprocess.Popen([FF, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
    '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-crf', '17',
    '-preset', 'medium', '-pix_fmt', 'yuv420p', str(OPENING)], stdin=subprocess.PIPE)
index = -1
for tick in range(MOVE_FRAMES + 1):
    t = tick / MOVE_FRAMES
    ease = t*t*t*(10 + t*(-15 + 6*t))
    target = round(ease*last_index)
    while index < target:
        ok, frame = cap.read()
        assert ok, index
        index += 1
    process.stdin.write(frame.tobytes())
process.stdin.close()
assert process.wait() == 0
cap.release()

# Brief open-state pause and a longer finished-home pause. Both directions
# begin and finish at rest; the loop seam repeats the same finished frame.
print('Encoding the seamless 60 fps opening / closing loop...', flush=True)
run(['-i', str(OPENING), '-filter_complex',
     '[0:v]split[a][b];[a]tpad=stop_mode=clone:stop_duration=0.6[open];'
     '[b]reverse,setpts=PTS-STARTPTS[close];'
     '[open][close]concat=n=2:v=1:a=0,fps=60,tpad=stop_mode=clone:stop=120[out]', '-map', '[out]', '-an', '-r', str(FPS),
     '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
     '-movflags', '+faststart', str(OUTPUT)])
cap = cv2.VideoCapture(str(OUTPUT))
count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
ok, first = cap.read()
assert ok
cap.set(cv2.CAP_PROP_POS_FRAMES, count-1)
ok, last = cap.read()
assert ok
assert int(cap.get(cv2.CAP_PROP_FPS)) == FPS
assert count >= 690, 'The completed-home pause is missing.'
error = float(np.abs(first.astype(float)-last.astype(float)).mean())
assert error < 3, f'Loop seam differs: {error}'
cv2.imwrite(str(ROOT / 'home-smooth-construction-poster-v4.jpg'), first, [cv2.IMWRITE_JPEG_QUALITY, 94])
report = {'output':str(OUTPUT),'fps':FPS,'width':W,'height':H,'frames':count,'duration':count/FPS,
          'loopSeamMeanError':error,'timing':'quintic ease-in-out','crop':False,'browserPlaybackRate':1,
          'source':'existing construction footage; geometry not regenerated'}
Path('output/hero-smooth-v4-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report), flush=True)
