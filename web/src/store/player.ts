import { create } from 'zustand';

interface PlayerState {
  queue: string[];
  index: number;
  isPlaying: boolean;
  volume: number;
  bass: number;
  treble: number;
  repeat: 'off' | 'one' | 'all';
  shuffle: boolean;
  setQueue: (ids: string[], start?: number) => void;
  next: () => void;
  prev: () => void;
  setPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setEq: (bass: number, treble: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  index: 0,
  isPlaying: false,
  volume: 0.8,
  bass: 0,
  treble: 0,
  repeat: 'off',
  shuffle: false,
  setQueue: (queue, index = 0) => set({ queue, index }),
  next: () => set({ index: Math.min(get().index + 1, get().queue.length - 1) }),
  prev: () => set({ index: Math.max(get().index - 1, 0) }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setEq: (bass, treble) => set({ bass, treble }),
}));
