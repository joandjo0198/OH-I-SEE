"""Use the text-free assembly segment of the original, without inpainting."""
from pathlib import Path
import subprocess
import sys
sys.path.insert(0, 'output/media-tools')
import imageio_ffmpeg

source = next(p for p in Path('C:/Users/Andrew paul/Downloads').glob('Architectural_exploded_view_anim*.mp4') if 'cutter' not in p.name)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
dest = Path('frontend/public/videos')
# Frames 150–210 contain clean architecture and the original roof closing.
# Reverse that section to open, then play forward to close without a jump.
filters = ('[0:v]trim=start_frame=150:end_frame=211,setpts=PTS-STARTPTS,'
           'crop=1920:984:0:96,pad=2190:984:270:0:color=0x0a1119,split[a][b];'
           '[a]reverse,setpts=PTS-STARTPTS[open];'
           '[b]setpts=PTS-STARTPTS[close];'
           '[open][close]concat=n=2:v=1:a=0,setpts=1.5*PTS,fps=24[out]')
subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', str(source),
                '-filter_complex', filters, '-map', '[out]', '-an',
                '-c:v', 'libx264', '-crf', '17', '-preset', 'medium',
                '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                str(dest / 'original-clean-roof.mp4')], check=True)
subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', str(dest / 'original-clean-roof.mp4'),
                '-frames:v', '1', str(dest / 'original-clean-roof-poster.png')], check=True)
print('Built original clean roof loop and matching poster.')
