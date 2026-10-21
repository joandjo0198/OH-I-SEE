import sys,subprocess
sys.path.insert(0,'output/media-tools')
import imageio_ffmpeg
r=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-loglevel','error','-framerate','30','-i','output/hero-retouched/ezgif-frame-%03d.png','-frames:v','260','-vf','hqdn3d=1.0:1.0:2:2,unsharp=5:5:0.3:3:3:0','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart','frontend/public/videos/house-construction-hq.mp4'],check=True)
print('High-quality H.264 animation encoded from lossless retouched frames.')
