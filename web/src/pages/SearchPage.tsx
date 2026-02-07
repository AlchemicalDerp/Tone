import { useState } from 'react';
import { api } from '../api/client';

export function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any>();
  return (
    <div>
      <input placeholder="Search everything" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter') setResults(await api(`/search?q=${encodeURIComponent(q)}`)); }} />
      {results && <div className="grid">
        {['tracks', 'artists', 'albums', 'playlists', 'users'].map((k) => <section key={k}><h3>{k}</h3><ul>{results[k]?.map((x: any) => <li key={x.id}>{x.title || x.name || x.displayName}</li>)}</ul></section>)}
      </div>}
    </div>
  );
}
