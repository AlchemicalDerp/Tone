import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function HomePage() {
  const [data, setData] = useState<any>();
  useEffect(() => { void api('/discover').then(setData); }, []);
  return (
    <div>
      <h2>Discover</h2>
      <h3>Recently Added</h3>
      <ul>{data?.recent?.map((t: any) => <li key={t.id}>{t.title}</li>)}</ul>
      <h3>Trending</h3>
      <ul>{data?.trending?.map((t: any) => <li key={t.id}>{t.title}</li>)}</ul>
      <h3>For You</h3>
      <ul>{data?.forYou?.map((t: any) => <li key={t.id}>{t.title} <small>Because you listened to {t.reason}</small></li>)}</ul>
    </div>
  );
}
