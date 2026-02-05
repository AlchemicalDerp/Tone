import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function AdminPage() {
  const [dashboard, setDashboard] = useState<any>();
  useEffect(() => { void api('/admin/dashboard').then(setDashboard); }, []);

  return <div><h2>Admin</h2><p>Users: {dashboard?.users} Tracks: {dashboard?.tracks}</p><h3>Audit</h3><ul>{dashboard?.logs?.map((l: any) => <li key={l.id}>{l.action}</li>)}</ul></div>;
}
