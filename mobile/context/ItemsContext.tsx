import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createItemListing, fetchItemListings, type CreateItemListingInput } from '../lib/itemListings';
import type { ItemListing } from '../types/database';

type ItemsContextType = {
  items: ItemListing[];
  addItem: (input: CreateItemListingInput) => Promise<void>;
  refreshItems: () => Promise<void>;
  loading: boolean;
  error: string | null;
};

const ItemsContext = createContext<ItemsContextType | null>(null);

export const ItemsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ItemListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchItemListings();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const addItem = useCallback(
    async (input: CreateItemListingInput) => {
      setError(null);
      try {
        const newItem = await createItemListing(input);
        setItems((prev) => [newItem, ...prev]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add item');
        throw e;
      }
    },
    []
  );

  return (
    <ItemsContext.Provider value={{ items, addItem, refreshItems, loading, error }}>
      {children}
    </ItemsContext.Provider>
  );
};

export const useItems = (): ItemsContextType => {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItems must be used within ItemsProvider');
  return ctx;
};
