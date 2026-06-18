require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');
const { reprobeCamera } = require('../services/cameraProbeService');
const recordingService = require('../services/recordingService');
const { spawnSync } = require('child_process');

const checkFfmpeg = () => {
  try {
    const res = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-version'], { encoding: 'utf8', timeout: 2000 });
    return !res.error && res.status === 0;
  } catch {
    return false;
  }
};

const run = async () => {
  try {
    await connectDB();
    const cams = await Camera.find({}).select('+password');
    if (!cams.length) {
      console.log('No cameras found');
      process.exit(0);
    }

    const ffmpegOk = checkFfmpeg();
    console.log('FFmpeg available:', ffmpegOk);

    for (const cam of cams) {
      console.log('---');
      console.log(`Probing ${cam.name} (${cam.ipAddress})`);
      try {
        const { portResults, streamUrl } = await reprobeCamera(cam);
        console.log('portResults:', portResults);
        if (streamUrl) {
          cam.streamUrl = streamUrl;
          await cam.save();
          console.log('Saved streamUrl:', streamUrl);
          if (ffmpegOk) {
            try {
              console.log('Attempting to start recording...');
              await recordingService.startRecording(cam);
              console.log('Recording started for', cam.name);
            } catch (err) {
              console.error('Failed to start recording:', err.message || err);
            }
          } else {
            console.log('Skipping recording start: FFmpeg unavailable');
          }
        } else {
          console.log('No streamUrl found');
        }
      } catch (err) {
        console.error('Probe error:', err.message || err);
      }
    }

    console.log('Done reprobe-and-start');
    process.exit(0);
  } catch (err) {
    console.error('reprobe-and-start error:', err.message || err);
    process.exit(1);
  }
};

run();
