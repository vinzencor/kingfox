import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useStoreAuth } from './StoreAuthContext';

interface StoreInventoryItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  color: string;
  price: number;
  quantity: number;
  size: string;
}

interface StoreInventoryContextType {
  inventory: StoreInventoryItem[];
  loading: boolean;
  error: string | null;
  refreshInventory: () => Promise<void>;
  updateInventoryQuantity: (sizeStockId: string, newQuantity: number) => Promise<void>;
}

const StoreInventoryContext = createContext<StoreInventoryContextType | undefined>(undefined);

interface StoreInventoryProviderProps {
  children: ReactNode;
}

export function StoreInventoryProvider({ children }: StoreInventoryProviderProps) {
  const { user } = useStoreAuth();
  const [inventory, setInventory] = useState<StoreInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.store_id) {
      loadInventory();
      setupRealtimeSubscription();
    }
  }, [user?.store_id]);

  const loadInventory = async () => {
    if (!user?.store_id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('store_inventory')
        .select(`
          id,
          quantity,
          size_stock!inner(
            id,
            barcode,
            price,
            variants!inner(
              name,
              categories!inner(name)
            ),
            colors!inner(name),
            sizes!inner(id, name)
          )
        `)
        .eq('store_id', user.store_id)
        .order('quantity', { ascending: false });

      if (fetchError) throw fetchError;

      const inventoryItems: StoreInventoryItem[] = data?.map(item => ({
        id: item.size_stock.id,
        barcode: item.size_stock.barcode,
        name: item.size_stock.variants.name,
        category: item.size_stock.variants.categories.name,
        color: item.size_stock.colors.name,
        price: item.size_stock.price,
        quantity: item.quantity,
        size: item.size_stock.sizes.name
      })) || [];

      setInventory(inventoryItems);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading store inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user?.store_id) return;

    // Subscribe to store inventory changes
    const inventorySubscription = supabase
      .channel('store_inventory_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_inventory',
          filter: `store_id=eq.${user.store_id}`
        },
        (payload) => {
          console.log('Store inventory change detected:', payload);
          refreshInventory();
        }
      )
      .subscribe();

    // Subscribe to sales transactions (which affect inventory)
    const salesSubscription = supabase
      .channel('sales_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_transactions',
          filter: `store_id=eq.${user.store_id}`
        },
        (payload) => {
          console.log('Sale transaction detected:', payload);
          refreshInventory();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      inventorySubscription.unsubscribe();
      salesSubscription.unsubscribe();
    };
  };

  const refreshInventory = async () => {
    await loadInventory();
  };

  const updateInventoryQuantity = async (sizeStockId: string, newQuantity: number) => {
    if (!user?.store_id) return;

    try {
      const { error } = await supabase
        .from('store_inventory')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('store_id', user.store_id)
        .eq('size_stock_id', sizeStockId);

      if (error) throw error;

      // Update local state immediately for better UX
      setInventory(prev => prev.map(item => 
        item.id === sizeStockId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const value: StoreInventoryContextType = {
    inventory,
    loading,
    error,
    refreshInventory,
    updateInventoryQuantity
  };

  return (
    <StoreInventoryContext.Provider value={value}>
      {children}
    </StoreInventoryContext.Provider>
  );
}

export function useStoreInventory() {
  const context = useContext(StoreInventoryContext);
  if (context === undefined) {
    throw new Error('useStoreInventory must be used within a StoreInventoryProvider');
  }
  return context;
}
