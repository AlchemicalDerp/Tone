import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => { void api('/history').then(setHistory); }, []);
  return <div><h2>History</h2><ul>{history.map((h) => <li key={h.id}>{h.track.title} ({Math.round(h.msPlayed/1000)}s)</li>)}</ul></div>;
}
