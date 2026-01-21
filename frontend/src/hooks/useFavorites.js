import { useState, useEffect } from 'react';

const STORAGE_KEY = 'scheduled-payments-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  }, []);

  // Save to localStorage whenever favorites change
  const saveFavorites = (newFavorites) => {
    setFavorites(newFavorites);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  };

  const addFavorite = (address, label = '') => {
    const normalizedAddress = address.toLowerCase();
    
    // Check if already exists
    if (favorites.some(f => f.address.toLowerCase() === normalizedAddress)) {
      return false;
    }

    const newFavorite = {
      address,
      label: label || `Address ${favorites.length + 1}`,
      createdAt: Date.now()
    };

    saveFavorites([...favorites, newFavorite]);
    return true;
  };

  const removeFavorite = (address) => {
    const normalizedAddress = address.toLowerCase();
    saveFavorites(favorites.filter(f => f.address.toLowerCase() !== normalizedAddress));
  };

  const updateFavoriteLabel = (address, newLabel) => {
    const normalizedAddress = address.toLowerCase();
    saveFavorites(
      favorites.map(f => 
        f.address.toLowerCase() === normalizedAddress 
          ? { ...f, label: newLabel }
          : f
      )
    );
  };

  const isFavorite = (address) => {
    if (!address) return false;
    const normalizedAddress = address.toLowerCase();
    return favorites.some(f => f.address.toLowerCase() === normalizedAddress);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    updateFavoriteLabel,
    isFavorite
  };
}
