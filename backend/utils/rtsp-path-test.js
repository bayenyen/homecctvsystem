const { spawnSync } = require('child_process');
const ffprobe = 'C:\\Users\\bryne\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffprobe.exe';
const host = process.argv[2] || '192.168.1.3';
const paths = [
  '/stream',
  '/h264',
  '/ch01/0',
  '/live',
  '/live.sdp',
  '/mpeg4',
  '/11',
  '/12',
  '/0',
  '/cam/realmonitor?channel=1&subtype=0',
  '/realmonitor?channel=1&subtype=0',
  '/h264/ch1/main/av_stream',
  '/h264/ch1/sub/av_stream',
  '/live/ch00?transportmode=unicast',
  '/live/ch0?transportmode=unicast',
  '/live/ch1?transportmode=unicast',
  '/live/ch00?transportmode=multicast',
  '/live/ch0?transportmode=multicast',
  '/live/ch1?transportmode=multicast',
  '/live/ch0?transportmode=unicast&user=admin&password=',
  '/user=admin&password=&channel=1&stream=0.sdp',
  '/user=admin&password=&channel=1&stream=0',
  '/user=admin&password=&channel=0&stream=0.sdp',
  '/user=admin&password=&channel=0&stream=0',
  '/media.sdp',
  '/video.cgi',
  '/live1.sdp',
  '/stream1',
  '/'
];

for (const path of paths) {
  const url = `rtsp://${host}:554${path}`;
  process.stdout.write(`Trying ${url} ... `);
  const res = spawnSync(ffprobe, ['-v', 'error', '-show_streams', '-print_format', 'json', url], { encoding: 'utf8', timeout: 10000 });
  if (res.error) {
    console.log(`ERROR ${res.error.message}`);
  } else if (res.status === 0) {
    console.log('OK');
    console.log(res.stdout);
    break;
  } else {
    console.log(`FAIL (exit ${res.status})`);
    if (res.stderr) console.log(res.stderr.trim());
  }
}
