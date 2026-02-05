import { Link, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api/client';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { PlayerBar } from './components/PlayerBar';

export function App() {
  const [me, setMe] = useState<any>(null);

  const refresh = async () => {
    const res = await api<{ user: any }>('/auth/me');
    setMe(res.user);
  };

  useEffect(() => { void refresh(); }, []);

  if (!me) return <LoginPage onLoggedIn={refresh} />;

  return (
    <div className="layout">
      <aside>
        <h1>Tone</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/search">Search</Link>
          <Link to="/library">Library</Link>
          <Link to="/playlists">Playlists</Link>
          <Link to="/history">History</Link>
          <Link to="/profile">Profile</Link>
          {me.role === 'admin' && <Link to="/admin">Admin</Link>}
        </nav>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <PlayerBar />
    </div>
  );
}
