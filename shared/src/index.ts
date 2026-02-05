export type Role = 'admin' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  isPublicProfile: boolean;
}

export interface TrackSummary {
  id: string;
  title: string;
  durationMs: number;
  album?: string | null;
  artists: string[];
  codec?: string | null;
  coverArtId?: string | null;
}
