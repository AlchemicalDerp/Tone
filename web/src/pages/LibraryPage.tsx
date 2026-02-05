import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { usePlayerStore } from '../store/player';

export function LibraryPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const { setQueue } = usePlayerStore();

  useEffect(() => { void api('/tracks').then(setTracks); }, []);

  return <table><thead><tr><th></th><th>Title</th><th>Artist</th><th>Album</th><th>Duration</th></tr></thead><tbody>{tracks.map((t) => <tr key={t.id}><td><button onClick={() => setQueue(tracks.map((x) => x.id), tracks.findIndex((x) => x.id === t.id))}>▶</button></td><td>{t.title}</td><td>{t.artists.map((a: any) => a.artist.name).join(', ')}</td><td>{t.album?.title}</td><td>{Math.round(t.durationMs / 1000)}s</td></tr>)}</tbody></table>;
}
