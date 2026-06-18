// src/pages/PlaybackPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { recordingService } from '../services/api';
import { format } from 'date-fns';
import {
  ArrowLeft, Download, Film, Camera, Clock, HardDrive,
  Play, Pause, Volume2, VolumeX, Maximize, Minimize
} from 'lucide-react';

export default function PlaybackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    recordingService.get(id)
      .then(({ data }) => setRecording(data.data))
      .catch(() => setError('Recording not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const streamUrl = recordingService.getStreamUrl(id);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  const toggleMute = () => {
    if (videoRef.current) videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const pct = parseFloat(e.target.value) / 100;
    videoRef.current.currentTime = pct * videoRef.current.duration;
    setProgress(parseFloat(e.target.value));
  };

  const toggleFullscreen = () => {
    const el = videoRef.current?.parentElement;
    if (!fullscreen) el?.requestFullscreen();
    else document.exitFullscreen();
    setFullscreen(!fullscreen);
  };

  const handleDownload = () => {
    const url = recordingService.getDownloadUrl(id);
    const a = document.createElement('a');
    a.href = url;
    a.download = recording?.filename || 'recording.mp4';
    a.click();
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !recording) return (
    <div className="card p-16 text-center">
      <Film size={40} className="mx-auto mb-3 text-gray-600" />
      <p className="text-gray-400">{error || 'Recording not found'}</p>
      <Link to="/recordings" className="btn-secondary mt-4 mx-auto">
        <ArrowLeft size={14} /> Back to Recordings
      </Link>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary text-sm">
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{recording.filename}</h2>
          <p className="text-gray-400 text-sm">{recording.cameraName}</p>
        </div>
        <button onClick={handleDownload} className="btn-primary text-sm">
          <Download size={14} /> Download
        </button>
      </div>

      {/* Video player */}
      <div className="card overflow-hidden bg-black">
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full"
            src={streamUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
          />

          {/* Controls overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* Progress */}
            <div className="mb-3">
              <input
                type="range" min={0} max={100}
                value={progress} onChange={handleSeek}
                className="w-full h-1 accent-accent-blue cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime((progress / 100) * duration)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                {playing ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white" />}
              </button>
              <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <div className="flex-1" />
              <button onClick={toggleFullscreen} className="text-gray-400 hover:text-white transition-colors">
                {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>

          {/* Play button when paused */}
          {!playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="w-16 h-16 bg-white/10 group-hover:bg-white/20 rounded-full flex items-center justify-center transition-all backdrop-blur-sm">
                <Play size={28} className="text-white ml-1" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Recording details */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Camera, label: 'Camera', value: recording.cameraName },
          { icon: Clock, label: 'Start Time', value: recording.startTime ? format(new Date(recording.startTime), 'MMM dd, HH:mm:ss') : '—' },
          { icon: Film, label: 'Duration', value: recording.duration ? `${Math.floor(recording.duration / 60)}m ${recording.duration % 60}s` : '—' },
          { icon: HardDrive, label: 'File Size', value: formatSize(recording.fileSize) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-accent-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-accent-blue" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-medium text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
