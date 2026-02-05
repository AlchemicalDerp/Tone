import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function PlaylistsPage() {
  const [lists, setLists] = useState<any[]>([]);
  useEffect(() => { void api('/playlists').then(setLists); }, []);
  return <div><h2>Your Playlists</h2><ul>{lists.map((p) => <li key={p.id}>{p.name} ({p.tracks.length})</li>)}</ul></div>;
}
