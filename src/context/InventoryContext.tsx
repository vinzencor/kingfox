import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Size {
  id: string;
  name: string;
  order: number;
}

export interface Color {
  id: string;
  name: string;
  hex: string;
  sizes: { [sizeId: string]: number }; // size -> stock quantity
}

export interface BarcodeGroup {
  id: string;
  name: string;
  sizeIds: string[];
  price: number;
  barcode: string;
}

export interface Variant {
  id: string;
  name: string;
  colors: Color[];
  barcodeGroups: BarcodeGroup[];
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
  addCategory: (name: string) => void;
  addVariant: (categoryId: string, name: string) => void;
  addColor: (categoryId: string, variantId: string, color: Omit<Color, 'id' | 'sizes'>) => void;
  addBarcodeGroup: (categoryId: string, variantId: string, group: Omit<BarcodeGroup, 'id' | 'barcode'>) => void;
  updateStock: (categoryId: string, variantId: string, colorId: string, sizeId: string, quantity: number) => void;
  distributeToStore: (storeId: string, productKey: string, quantity: number) => void;
  sellProduct: (storeId: string, barcode: string) => boolean;
  addStore: (name: string, location: string) => void;
  getProductByBarcode: (barcode: string) => any;
  getTotalStock: () => number;
  getStoreStock: (storeId: string) => number;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const DEFAULT_SIZES: Size[] = [
  { id: 's', name: 'S', order: 1 },
  { id: 'm', name: 'M', order: 2 },
  { id: 'l', name: 'L', order: 3 },
  { id: 'xl', name: 'XL', order: 4 },
  { id: 'xxl', name: 'XXL', order: 5 },
];

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [sizes] = useState<Size[]>(DEFAULT_SIZES);

  // Initialize with sample data
  useEffect(() => {
    const sampleCategories: Category[] = [
      {
        id: 'tshirts',
        name: 'T-Shirts',
        variants: [
          {
            id: 'polos',
            name: 'Polos',
            colors: [
              {
                id: 'red',
                name: 'Red',
                hex: '#EF4444',
                sizes: { s: 100, m: 100, l: 100, xl: 50, xxl: 50 }
              },
              {
                id: 'blue',
                name: 'Blue',
                hex: '#3B82F6',
                sizes: { s: 80, m: 80, l: 80, xl: 40, xxl: 40 }
              }
            ],
            barcodeGroups: [
              {
                id: 'sm-group',
                name: 'Small-Medium',
                sizeIds: ['s', 'm'],
                price: 29.99,
                barcode: '123456789012'
              },
              {
                id: 'lxl-group',
                name: 'Large-XL',
                sizeIds: ['l', 'xl', 'xxl'],
                price: 34.99,
                barcode: '123456789013'
              }
            ]
          }
        ]
      }
    ];

    const sampleStores: Store[] = [
      { id: 'store1', name: 'Downtown Store', location: 'Main Street', inventory: {} },
      { id: 'store2', name: 'Mall Store', location: 'Shopping Center', inventory: {} },
      { id: 'store3', name: 'Outlet Store', location: 'Industrial Area', inventory: {} },
    ];

    setCategories(sampleCategories);
    setStores(sampleStores);
  }, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);
  const generateBarcode = () => Math.random().toString().substr(2, 12);

  const addCategory = (name: string) => {
    const newCategory: Category = {
      id: generateId(),
      name,
      variants: []
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const addVariant = (categoryId: string, name: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, variants: [...cat.variants, { id: generateId(), name, colors: [], barcodeGroups: [] }] }
        : cat
    ));
  };

  const addColor = (categoryId: string, variantId: string, color: Omit<Color, 'id' | 'sizes'>) => {
    const initialSizes = sizes.reduce((acc, size) => ({ ...acc, [size.id]: 0 }), {});
    const newColor: Color = {
      ...color,
      id: generateId(),
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
  };

  const addBarcodeGroup = (categoryId: string, variantId: string, group: Omit<BarcodeGroup, 'id' | 'barcode'>) => {
    const newGroup: BarcodeGroup = {
      ...group,
      id: generateId(),
      barcode: generateBarcode()
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
  };

  const updateStock = (categoryId: string, variantId: string, colorId: string, sizeId: string, quantity: number) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? {
            ...cat,
            variants: cat.variants.map(variant =>
              variant.id === variantId
                ? {
                    ...variant,
                    colors: variant.colors.map(color =>
                      color.id === colorId
                        ? { ...color, sizes: { ...color.sizes, [sizeId]: quantity } }
                        : color
                    )
                  }
                : variant
            )
          }
        : cat
    ));
  };

  const distributeToStore = (storeId: string, productKey: string, quantity: number) => {
    const [categoryId, variantId, colorId, sizeId] = productKey.split('-');
    
    // Update warehouse stock
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? {
            ...cat,
            variants: cat.variants.map(variant =>
              variant.id === variantId
                ? {
                    ...variant,
                    colors: variant.colors.map(color =>
                      color.id === colorId
                        ? { ...color, sizes: { ...color.sizes, [sizeId]: Math.max(0, color.sizes[sizeId] - quantity) } }
                        : color
                    )
                  }
                : variant
            )
          }
        : cat
    ));

    // Update store inventory
    setStores(prev => prev.map(store =>
      store.id === storeId
        ? { ...store, inventory: { ...store.inventory, [productKey]: (store.inventory[productKey] || 0) + quantity } }
        : store
    ));
  };

  const sellProduct = (storeId: string, barcode: string) => {
    const product = getProductByBarcode(barcode);
    if (!product) return false;

    const { categoryId, variantId, colorId, barcodeGroup } = product;
    
    // Find available size in the barcode group
    let soldSize = null;
    for (const sizeId of barcodeGroup.sizeIds) {
      const productKey = `${categoryId}-${variantId}-${colorId}-${sizeId}`;
      const storeStock = stores.find(s => s.id === storeId)?.inventory[productKey] || 0;
      
      if (storeStock > 0) {
        soldSize = sizeId;
        break;
      }
    }

    if (!soldSize) return false;

    const productKey = `${categoryId}-${variantId}-${colorId}-${soldSize}`;
    
    // Reduce store inventory
    setStores(prev => prev.map(store =>
      store.id === storeId
        ? { ...store, inventory: { ...store.inventory, [productKey]: Math.max(0, (store.inventory[productKey] || 0) - 1) } }
        : store
    ));

    return true;
  };

  const addStore = (name: string, location: string) => {
    const newStore: Store = {
      id: generateId(),
      name,
      location,
      inventory: {}
    };
    setStores(prev => [...prev, newStore]);
  };

  const getProductByBarcode = (barcode: string) => {
    for (const category of categories) {
      for (const variant of category.variants) {
        for (const barcodeGroup of variant.barcodeGroups) {
          if (barcodeGroup.barcode === barcode) {
            return {
              categoryId: category.id,
              categoryName: category.name,
              variantId: variant.id,
              variantName: variant.name,
              colorId: variant.colors[0]?.id, // Default to first color
              barcodeGroup
            };
          }
        }
      }
    }
    return null;
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

  return (
    <InventoryContext.Provider value={{
      categories,
      stores,
      sizes,
      addCategory,
      addVariant,
      addColor,
      addBarcodeGroup,
      updateStock,
      distributeToStore,
      sellProduct,
      addStore,
      getProductByBarcode,
      getTotalStock,
      getStoreStock
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}