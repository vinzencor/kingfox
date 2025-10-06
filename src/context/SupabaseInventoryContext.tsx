import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, SizeStock } from '../lib/supabase';

export interface Size {
  id: string;
  name: string;
  order: number;
}

export interface Color {
  id: string;
  variant_id: string;
  name: string;
  hex: string;
  sizes: { [sizeId: string]: number }; // size -> stock quantity
}

export interface BarcodeGroup {
  id: string;
  variant_id: string;
  name: string;
  size_ids: string[];
  price: number;
  barcode: string;
}

export interface Variant {
  id: string;
  category_id: string;
  name: string;
  colors: Color[];
  barcodeGroups: BarcodeGroup[];
  sizeStock?: SizeStock[];
}

export interface Category {
  id: string;
  name: string;
  variants: Variant[];
}

export interface Store {
  id: string;
  name: string;
  location: string;
  inventory: { [key: string]: number }; // productId -> quantity
}

export interface InventoryContextType {
  categories: Category[];
  stores: Store[];
  sizes: Size[];
  sizeStock: SizeStock[];
  loading: boolean;
  error: string | null;
  addCategory: (name: string) => Promise<void>;
  addVariant: (categoryId: string, name: string) => Promise<void>;
  addColor: (categoryId: string, variantId: string, color: Omit<Color, 'id' | 'variant_id' | 'sizes'>) => Promise<void>;
  addBarcodeGroup: (categoryId: string, variantId: string, group: Omit<BarcodeGroup, 'id' | 'variant_id' | 'barcode'>) => Promise<void>;
  addSizeStock: (variantId: string, colorId: string, sizeId: string, barcode: string, price: number, stock: number) => Promise<void>;
  updateSizeStock: (sizeStockId: string, updates: { barcode?: string; price?: number; warehouse_stock?: number }) => Promise<void>;
  updateStock: (categoryId: string, variantId: string, colorId: string, sizeId: string, quantity: number) => Promise<void>;
  distributeToStore: (storeId: string, variantId: string, colorId: string, sizeId: string, quantity: number) => Promise<void>;
  sellProduct: (storeId: string, barcode: string) => Promise<boolean>;
  addStore: (name: string, location: string) => Promise<void>;
  getProductByBarcode: (barcode: string) => Promise<any>;
  getTotalStock: () => number;
  getStoreStock: (storeId: string) => number;
  refreshData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function SupabaseInventoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [sizeStock, setSizeStock] = useState<SizeStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all data from Supabase
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load sizes
      const { data: sizesData, error: sizesError } = await supabase
        .from('sizes')
        .select('*')
        .order('order');

      if (sizesError) throw sizesError;
      setSizes(sizesData || []);

      // Load categories with variants, colors, barcode groups, and size stock
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select(`
          *,
          variants (
            *,
            colors (*),
            barcode_groups (*)
          )
        `)
        .order('name');

      // Load size stock data
      const { data: sizeStockData, error: sizeStockError } = await supabase
        .from('size_stock')
        .select('*');

      if (sizeStockError) throw sizeStockError;

      if (categoriesError) throw categoriesError;

      // Load warehouse inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('warehouse_inventory')
        .select('*');

      if (inventoryError) throw inventoryError;

      // Process categories data
      const processedCategories: Category[] = (categoriesData || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        variants: (cat.variants || []).map((variant: any) => ({
          id: variant.id,
          category_id: variant.category_id,
          name: variant.name,
          colors: (variant.colors || []).map((color: any) => {
            // Build sizes object from warehouse inventory
            const colorSizes: { [sizeId: string]: number } = {};
            (sizesData || []).forEach(size => {
              const inventory = inventoryData?.find(inv => 
                inv.variant_id === variant.id && 
                inv.color_id === color.id && 
                inv.size_id === size.id
              );
              colorSizes[size.id] = inventory?.quantity || 0;
            });

            return {
              id: color.id,
              variant_id: color.variant_id,
              name: color.name,
              hex: color.hex,
              sizes: colorSizes
            };
          }),
          barcodeGroups: variant.barcode_groups || [],
          sizeStock: sizeStockData?.filter(stock => stock.variant_id === variant.id) || []
        }))
      }));

      setCategories(processedCategories);
      setSizeStock(sizeStockData || []);

      // Load stores with inventory
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (storesError) throw storesError;

      const { data: storeInventoryData, error: storeInventoryError } = await supabase
        .from('store_inventory')
        .select('*');

      if (storeInventoryError) throw storeInventoryError;

      // Process stores data
      const processedStores: Store[] = (storesData || []).map(store => {
        const storeInventory: { [key: string]: number } = {};
        (storeInventoryData || [])
          .filter(inv => inv.store_id === store.id)
          .forEach(inv => {
            const key = `${inv.variant_id}-${inv.color_id}-${inv.size_id}`;
            storeInventory[key] = inv.quantity;
          });

        return {
          id: store.id,
          name: store.name,
          location: store.location,
          inventory: storeInventory
        };
      });

      setStores(processedStores);

    } catch (err: any) {
      setError(err.message);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up real-time subscriptions
    const warehouseSubscription = supabase
      .channel('warehouse_inventory_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'warehouse_inventory' },
        () => {
          console.log('Warehouse inventory changed, refreshing data...');
          loadData();
        }
      )
      .subscribe();

    const storeSubscription = supabase
      .channel('store_inventory_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'store_inventory' },
        () => {
          console.log('Store inventory changed, refreshing data...');
          loadData();
        }
      )
      .subscribe();

    const salesSubscription = supabase
      .channel('sales_transactions_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales_transactions' },
        () => {
          console.log('New sale recorded, refreshing data...');
          loadData();
        }
      )
      .subscribe();

    const categoriesSubscription = supabase
      .channel('categories_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          console.log('Categories changed, refreshing data...');
          loadData();
        }
      )
      .subscribe();

    const variantsSubscription = supabase
      .channel('variants_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'variants' },
        () => {
          console.log('Variants changed, refreshing data...');
          loadData();
        }
      )
      .subscribe();

    const colorsSubscription = supabase
      .channel('colors_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'colors' },
        () => {
          console.log('Colors changed, refreshing data...');
          loadData();
        }
      )
      .subscribe();

    const barcodeGroupsSubscription = supabase
      .channel('barcode_groups_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'barcode_groups' },
        () => {
          console.log('Barcode groups changed, refreshing data...');
          loadData();
        }
      )
      .subscribe();

    const storesSubscription = supabase
      .channel('stores_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'stores' },
        () => {
          console.log('Stores changed, refreshing data...');
          loadData();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      warehouseSubscription.unsubscribe();
      storeSubscription.unsubscribe();
      salesSubscription.unsubscribe();
      categoriesSubscription.unsubscribe();
      variantsSubscription.unsubscribe();
      colorsSubscription.unsubscribe();
      barcodeGroupsSubscription.unsubscribe();
      storesSubscription.unsubscribe();
    };
  }, []);

  const addCategory = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name }])
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, {
        id: data.id,
        name: data.name,
        variants: []
      }]);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const addVariant = async (categoryId: string, name: string) => {
    try {
      const { data, error } = await supabase
        .from('variants')
        .insert([{ category_id: categoryId, name }])
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => prev.map(cat => 
        cat.id === categoryId 
          ? { 
              ...cat, 
              variants: [...cat.variants, { 
                id: data.id, 
                category_id: data.category_id,
                name: data.name, 
                colors: [], 
                barcodeGroups: [] 
              }] 
            }
          : cat
      ));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const addColor = async (categoryId: string, variantId: string, color: Omit<Color, 'id' | 'variant_id' | 'sizes'>) => {
    try {
      const { data, error } = await supabase
        .from('colors')
        .insert([{ variant_id: variantId, name: color.name, hex: color.hex }])
        .select()
        .single();

      if (error) throw error;

      // Initialize warehouse inventory for all sizes
      const inventoryInserts = sizes.map(size => ({
        variant_id: variantId,
        color_id: data.id,
        size_id: size.id,
        quantity: 0
      }));

      const { error: inventoryError } = await supabase
        .from('warehouse_inventory')
        .insert(inventoryInserts);

      if (inventoryError) throw inventoryError;

      const initialSizes = sizes.reduce((acc, size) => ({ ...acc, [size.id]: 0 }), {});
      const newColor: Color = {
        id: data.id,
        variant_id: data.variant_id,
        name: data.name,
        hex: data.hex,
        sizes: initialSizes
      };

      setCategories(prev => prev.map(cat => 
        cat.id === categoryId 
          ? {
              ...cat,
              variants: cat.variants.map(variant =>
                variant.id === variantId
                  ? { ...variant, colors: [...variant.colors, newColor] }
                  : variant
              )
            }
          : cat
      ));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const addBarcodeGroup = async (categoryId: string, variantId: string, group: Omit<BarcodeGroup, 'id' | 'variant_id' | 'barcode'>) => {
    try {
      const barcode = Math.random().toString().substr(2, 12);
      const { data, error } = await supabase
        .from('barcode_groups')
        .insert([{
          variant_id: variantId,
          name: group.name,
          size_ids: group.size_ids,
          price: group.price,
          barcode
        }])
        .select()
        .single();

      if (error) throw error;

      const newGroup: BarcodeGroup = {
        id: data.id,
        variant_id: data.variant_id,
        name: data.name,
        size_ids: data.size_ids,
        price: data.price,
        barcode: data.barcode
      };

      setCategories(prev => prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              variants: cat.variants.map(variant =>
                variant.id === variantId
                  ? { ...variant, barcodeGroups: [...variant.barcodeGroups, newGroup] }
                  : variant
              )
            }
          : cat
      ));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const addSizeStock = async (variantId: string, colorId: string, sizeId: string, barcode: string, price: number, stock: number) => {
    try {
      const { data, error } = await supabase
        .from('size_stock')
        .insert([{
          variant_id: variantId,
          color_id: colorId,
          size_id: sizeId,
          barcode: barcode,
          price: price,
          warehouse_stock: stock
        }])
        .select()
        .single();

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateSizeStock = async (sizeStockId: string, updates: { barcode?: string; price?: number; warehouse_stock?: number }) => {
    try {
      const { data, error } = await supabase
        .from('size_stock')
        .update(updates)
        .eq('id', sizeStockId)
        .select();

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateStock = async (categoryId: string, variantId: string, colorId: string, sizeId: string, quantity: number) => {
    try {
      // Find existing size_stock record
      const existingStock = sizeStock.find(
        stock => stock.variant_id === variantId && stock.color_id === colorId && stock.size_id === sizeId
      );

      if (existingStock) {
        // Update existing size_stock record
        const { error } = await supabase
          .from('size_stock')
          .update({ warehouse_stock: quantity })
          .eq('id', existingStock.id);

        if (error) throw error;
      } else {
        // If no size_stock record exists, we can't update it
        // This should be created through the "Manage Stock" flow instead
        throw new Error('No size stock record found. Please create a barcode first using "Manage Stock".');
      }

      // Update local sizeStock state
      setSizeStock(prev => prev.map(stock =>
        stock.variant_id === variantId && stock.color_id === colorId && stock.size_id === sizeId
          ? { ...stock, warehouse_stock: quantity }
          : stock
      ));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const distributeToStore = async (storeId: string, variantId: string, colorId: string, sizeId: string, quantity: number) => {
    try {
      // Find the size_stock record
      const { data: sizeStockData, error: sizeStockError } = await supabase
        .from('size_stock')
        .select('*')
        .eq('variant_id', variantId)
        .eq('color_id', colorId)
        .eq('size_id', sizeId)
        .single();

      if (sizeStockError) throw sizeStockError;

      if (!sizeStockData || sizeStockData.warehouse_stock < quantity) {
        throw new Error('Insufficient warehouse stock');
      }

      // Update warehouse stock in size_stock table (reduce)
      const { error: warehouseUpdateError } = await supabase
        .from('size_stock')
        .update({ warehouse_stock: sizeStockData.warehouse_stock - quantity })
        .eq('id', sizeStockData.id);

      if (warehouseUpdateError) throw warehouseUpdateError;

      // Update store inventory (increase) - using size_stock_id
      const { data: storeStock, error: storeStockError } = await supabase
        .from('store_inventory')
        .select('quantity')
        .eq('store_id', storeId)
        .eq('size_stock_id', sizeStockData.id)
        .single();

      const currentStoreStock = storeStock?.quantity || 0;

      const { error: storeUpdateError } = await supabase
        .from('store_inventory')
        .upsert([{
          store_id: storeId,
          size_stock_id: sizeStockData.id,
          quantity: currentStoreStock + quantity
        }], {
          onConflict: 'store_id,size_stock_id'
        });

      if (storeUpdateError) throw storeUpdateError;

      // Update local size_stock state
      setSizeStock(prev => prev.map(stock =>
        stock.id === sizeStockData.id
          ? { ...stock, warehouse_stock: stock.warehouse_stock - quantity }
          : stock
      ));

      // Update stores inventory display
      setStores(prev => prev.map(store =>
        store.id === storeId
          ? {
              ...store,
              inventory: {
                ...store.inventory,
                [`${sizeStockData.id}`]: currentStoreStock + quantity
              }
            }
          : store
      ));

    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const sellProduct = async (storeId: string, barcode: string) => {
    try {
      // First try to find in size_stock (individual size barcodes)
      const { data: sizeStock, error: sizeStockError } = await supabase
        .from('size_stock')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (!sizeStockError && sizeStock) {
        // Check if store has this specific size in stock
        const { data: storeInventory, error: inventoryError } = await supabase
          .from('store_inventory')
          .select('*')
          .eq('store_id', storeId)
          .eq('size_stock_id', sizeStock.id)
          .gt('quantity', 0)
          .single();

        if (inventoryError || !storeInventory) {
          throw new Error('Product out of stock in this store');
        }

        // Reduce store inventory
        const { error: updateError } = await supabase
          .from('store_inventory')
          .update({ quantity: storeInventory.quantity - 1 })
          .eq('id', storeInventory.id);

        if (updateError) throw updateError;

        // Record sale transaction
        const { error: transactionError } = await supabase
          .from('sales_transactions')
          .insert([{
            store_id: storeId,
            size_stock_id: sizeStock.id,
            barcode: barcode,
            quantity: 1,
            price: sizeStock.price,
            total_amount: sizeStock.price
          }]);

        if (transactionError) throw transactionError;

        await loadData(); // Refresh data
        return true;
      }

      // Fallback to barcode groups for compatibility
      const { data: barcodeGroup, error: barcodeError } = await supabase
        .from('barcode_groups')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (barcodeError || !barcodeGroup) {
        throw new Error('Product not found');
      }

      // Find available stock in store for any size in the barcode group
      const { data: storeInventory, error: inventoryError } = await supabase
        .from('store_inventory')
        .select('*')
        .eq('store_id', storeId)
        .eq('variant_id', barcodeGroup.variant_id)
        .in('size_id', barcodeGroup.size_ids)
        .gt('quantity', 0)
        .limit(1);

      if (inventoryError) throw inventoryError;

      if (!storeInventory || storeInventory.length === 0) {
        throw new Error('Product out of stock in this store');
      }

      const availableItem = storeInventory[0];

      // Reduce store inventory
      const { error: updateError } = await supabase
        .from('store_inventory')
        .update({ quantity: availableItem.quantity - 1 })
        .eq('id', availableItem.id);

      if (updateError) throw updateError;

      // Record sale transaction (old format for compatibility)
      const { error: transactionError } = await supabase
        .from('sales_transactions')
        .insert([{
          store_id: storeId,
          size_stock_id: null, // No size_stock for barcode groups
          barcode: barcode,
          quantity: 1,
          price: barcodeGroup.price,
          total_amount: barcodeGroup.price
        }]);

      if (transactionError) throw transactionError;

      await loadData(); // Refresh data
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const addStore = async (name: string, location: string) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .insert([{ name, location }])
        .select()
        .single();

      if (error) throw error;

      const newStore: Store = {
        id: data.id,
        name: data.name,
        location: data.location,
        inventory: {}
      };

      setStores(prev => [...prev, newStore]);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const getProductByBarcode = async (barcode: string) => {
    try {
      // First try to find in size_stock (individual size barcodes)
      const { data: sizeStock, error: sizeStockError } = await supabase
        .from('size_stock')
        .select(`
          *,
          variants (
            *,
            categories (*)
          ),
          colors (*),
          sizes (*)
        `)
        .eq('barcode', barcode)
        .single();

      if (!sizeStockError && sizeStock) {
        return {
          type: 'size_stock',
          categoryId: sizeStock.variants.categories.id,
          categoryName: sizeStock.variants.categories.name,
          variantId: sizeStock.variants.id,
          variantName: sizeStock.variants.name,
          colorId: sizeStock.colors.id,
          colorName: sizeStock.colors.name,
          sizeId: sizeStock.sizes.id,
          sizeName: sizeStock.sizes.name,
          price: sizeStock.price,
          stock: sizeStock.warehouse_stock,
          sizeStock: sizeStock
        };
      }

      // Fallback to barcode groups for compatibility
      const { data: barcodeGroup, error: barcodeError } = await supabase
        .from('barcode_groups')
        .select(`
          *,
          variants (
            *,
            categories (*)
          )
        `)
        .eq('barcode', barcode)
        .single();

      if (!barcodeError && barcodeGroup) {
        return {
          type: 'barcode_group',
          categoryId: barcodeGroup.variants.categories.id,
          categoryName: barcodeGroup.variants.categories.name,
          variantId: barcodeGroup.variants.id,
          variantName: barcodeGroup.variants.name,
          barcodeGroup: {
            id: barcodeGroup.id,
            name: barcodeGroup.name,
            size_ids: barcodeGroup.size_ids,
            price: barcodeGroup.price,
            barcode: barcodeGroup.barcode
          }
        };
      }

      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const getTotalStock = () => {
    return categories.reduce((total, category) =>
      total + category.variants.reduce((variantTotal, variant) =>
        variantTotal + variant.colors.reduce((colorTotal, color) =>
          colorTotal + Object.values(color.sizes).reduce((sizeTotal, stock) => sizeTotal + stock, 0), 0), 0), 0);
  };

  const getStoreStock = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return 0;
    return Object.values(store.inventory).reduce((total, stock) => total + stock, 0);
  };

  const refreshData = async () => {
    await loadData();
  };

  return (
    <InventoryContext.Provider value={{
      categories,
      stores,
      sizes,
      sizeStock,
      loading,
      error,
      addCategory,
      addVariant,
      addColor,
      addBarcodeGroup,
      addSizeStock,
      updateSizeStock,
      updateStock,
      distributeToStore,
      sellProduct,
      addStore,
      getProductByBarcode,
      getTotalStock,
      getStoreStock,
      refreshData
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useSupabaseInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useSupabaseInventory must be used within a SupabaseInventoryProvider');
  }
  return context;
}
