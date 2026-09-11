'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface FavItem {
  id: number;
  slug: string;
  name: string;
  price: number;
  image: string;
  secondaryImage: string;
}

interface FavContextValue {
  favourites: FavItem[];
  toggle: (item: FavItem) => void;
  isFavourite: (id: number) => boolean;
}

const FavContext = createContext<FavContextValue>({
  favourites: [],
  toggle: () => {},
  isFavourite: () => false,
});

const STORAGE_KEY = 'hamorge-favourites';

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const [favourites, setFavourites] = useState<FavItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavourites(JSON.parse(raw));
    } catch {}
  }, []);

  function toggle(item: FavItem) {
    setFavourites(prev => {
      const next = prev.some(f => f.id === item.id)
        ? prev.filter(f => f.id !== item.id)
        : [...prev, item];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function isFavourite(id: number) {
    return favourites.some(f => f.id === id);
  }

  return (
    <FavContext.Provider value={{ favourites, toggle, isFavourite }}>
      {children}
    </FavContext.Provider>
  );
}

export function useFavourites() {
  return useContext(FavContext);
}
