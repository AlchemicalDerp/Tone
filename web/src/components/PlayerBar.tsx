import { useEffect, useMemo, useRef, useState } from 'react';
import { API } from '../api/client';
import { usePlayerStore } from '../store/player';

export function PlayerBar() {
  const { queue, index, isPlaying, setPlaying, next, prev, volume, setVolume, bass, treble, setEq } = usePlayerStore();
  const currentId = queue[index];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentId) return;
    audio.src = `${API}/stream/${currentId}`;
    if (isPlaying) void audio.play();
  }, [currentId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    if (isPlaying) void audio.play();
    else audio.pause();
  }, [isPlaying, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const source = ctx.createMediaElementSource(audio);
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 200;
    bassFilter.gain.value = bass;
    const trebleFilter = ctx.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 3000;
    trebleFilter.gain.value = treble;
    source.connect(bassFilter).connect(trebleFilter).connect(ctx.destination);
  }, [bass, treble]);

  const progress = useMemo(() => (duration ? (time / duration) * 100 : 0), [duration, time]);

  return (
    <div className="player-bar">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={next}
      />
      <button onClick={prev}>⏮</button>
      <button onClick={() => setPlaying(!isPlaying)}>{isPlaying ? '⏸' : '▶'}</button>
      <button onClick={next}>⏭</button>
      <button onClick={() => audioRef.current && (audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0))}>-10s</button>
      <button onClick={() => audioRef.current && (audioRef.current.currentTime += 10)}>+10s</button>
      <div className="progress"><div style={{ width: `${progress}%` }} /></div>
      <span>{Math.round(time)} / {Math.round(duration)}s</span>
      <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
      <label>Bass<input type="range" min={-12} max={12} value={bass} onChange={(e) => setEq(Number(e.target.value), treble)} /></label>
      <label>Treble<input type="range" min={-12} max={12} value={treble} onChange={(e) => setEq(bass, Number(e.target.value))} /></label>
    </div>
  );
}
