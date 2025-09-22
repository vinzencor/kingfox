import React, { useState } from 'react';
import { Store, Plus, Send, Package, TrendingUp } from 'lucide-react';
import { useSupabaseInventory } from '../context/SupabaseInventoryContext';

function StoreManagement() {
  const { categories, stores, sizes, loading, error, addStore, distributeToStore, getStoreStock, sizeStock } = useSupabaseInventory();
  const [showAddStore, setShowAddStore] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [newStore, setNewStore] = useState({ name: '', location: '' });
  const [distributionData, setDistributionData] = useState({
    storeId: '',
    categoryId: '',
    variantId: '',
    colorId: '',
    sizeId: '',
    quantity: 0
  });

  const handleAddStore = async () => {
    if (newStore.name.trim() && newStore.location.trim()) {
      try {
        await addStore(newStore.name, newStore.location);
        setNewStore({ name: '', location: '' });
        setShowAddStore(false);
      } catch (error) {
        console.error('Error adding store:', error);
      }
    }
  };

  const handleDistribute = async () => {
    const { storeId, variantId, colorId, sizeId, quantity } = distributionData;
    if (storeId && variantId && colorId && sizeId && quantity > 0) {
      try {
        await distributeToStore(storeId, variantId, colorId, sizeId, quantity);
        setDistributionData({
          storeId: '',
          categoryId: '',
          variantId: '',
          colorId: '',
          sizeId: '',
          quantity: 0
        });
        setShowDistribution(false);
      } catch (error) {
        console.error('Error distributing stock:', error);
      }
    }
  };

  const getAvailableStock = () => {
    const { categoryId, variantId, colorId, sizeId } = distributionData;
    if (!categoryId || !variantId || !colorId || !sizeId) return 0;

    // Find the size stock record for this specific variant, color, and size
    const stockRecord = sizeStock.find(stock =>
      stock.variant_id === variantId &&
      stock.color_id === colorId &&
      stock.size_id === sizeId
    );

    return stockRecord?.warehouse_stock || 0;
  };

  const selectedCategory = categories.find(c => c.id === distributionData.categoryId);
  const selectedVariant = selectedCategory?.variants.find(v => v.id === distributionData.variantId);
  const selectedColor = selectedVariant?.colors.find(c => c.id === distributionData.colorId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-yellow">
            <Store className="w-8 h-8 text-brand-black" />
          </div>
          <p className="text-modern-600 font-medium">Loading stores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-modern text-center py-16">
        <div className="w-16 h-16 bg-accent-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Store className="w-8 h-8 text-accent-error" />
        </div>
        <h3 className="text-xl font-bold text-brand-black mb-2">Error Loading Stores</h3>
        <p className="text-modern-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-brand-black mb-3">
            Store <span className="text-gradient-yellow">Network</span>
          </h2>
          <p className="text-modern-600 text-lg font-medium">Manage stores and distribute inventory across locations</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowDistribution(true)}
            className="btn-secondary flex items-center space-x-2 group"
          >
            <Send size={20} className="group-hover:translate-x-1 transition-transform duration-200" />
            <span>Distribute Stock</span>
          </button>
          <button
            onClick={() => setShowAddStore(true)}
            className="btn-primary flex items-center space-x-2 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-200" />
            <span>Add Store</span>
          </button>
        </div>
      </div>

      {/* Add Store Modal */}
      {showAddStore && (
        <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="card-modern w-96 animate-slide-up">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-yellow-glow">
                <Store className="w-6 h-6 text-brand-black" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-black">Add New Store</h3>
                <p className="text-modern-600 text-sm">Expand your store network</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Store Name</label>
                <input
                  type="text"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  placeholder="Store name"
                  className="input-modern"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  value={newStore.location}
                  onChange={(e) => setNewStore({ ...newStore, location: e.target.value })}
                  placeholder="Store location"
                  className="input-modern"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddStore}
                className="btn-primary flex-1"
              >
                Add Store
              </button>
              <button
                onClick={() => setShowAddStore(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distribution Modal */}
      {showDistribution && (
        <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="card-modern w-[500px] animate-slide-up">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 gradient-black rounded-xl flex items-center justify-center shadow-modern">
                <Send className="w-6 h-6 text-brand-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-black">Distribute to Store</h3>
                <p className="text-modern-600 text-sm">Transfer inventory to store location</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Store</label>
                <select
                  value={distributionData.storeId}
                  onChange={(e) => setDistributionData({ ...distributionData, storeId: e.target.value })}
                  className="input-modern"
                >
                  <option value="">Select Store</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name} - {store.location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Category</label>
                <select
                  value={distributionData.categoryId}
                  onChange={(e) => setDistributionData({ ...distributionData, categoryId: e.target.value, variantId: '', colorId: '', sizeId: '' })}
                  className="input-modern"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              {selectedCategory && (
                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Variant</label>
                  <select
                    value={distributionData.variantId}
                    onChange={(e) => setDistributionData({ ...distributionData, variantId: e.target.value, colorId: '', sizeId: '' })}
                    className="input-modern"
                  >
                    <option value="">Select Variant</option>
                    {selectedCategory.variants.map(variant => (
                      <option key={variant.id} value={variant.id}>{variant.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedVariant && (
                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Color</label>
                  <select
                    value={distributionData.colorId}
                    onChange={(e) => setDistributionData({ ...distributionData, colorId: e.target.value, sizeId: '' })}
                    className="input-modern"
                  >
                    <option value="">Select Color</option>
                    {selectedVariant.colors.map(color => (
                      <option key={color.id} value={color.id}>{color.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedColor && (
                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Size</label>
                  <select
                    value={distributionData.sizeId}
                    onChange={(e) => setDistributionData({ ...distributionData, sizeId: e.target.value })}
                    className="input-modern"
                  >
                    <option value="">Select Size</option>
                    {sizes.map(size => (
                      <option key={size.id} value={size.id}>
                        {size.name} (Available: {selectedColor.sizes[size.id] || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">
                  Quantity
                </label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-modern-400" />
                  <input
                    type="number"
                    value={distributionData.quantity}
                    onChange={(e) => setDistributionData({ ...distributionData, quantity: parseInt(e.target.value) || 0 })}
                    max={getAvailableStock()}
                    className="input-modern pl-12 text-lg font-bold"
                    min="1"
                    placeholder="0"
                  />
                </div>
                <p className="text-sm text-modern-600 mt-1 font-medium">
                  Available: <span className="text-brand-yellow-dark font-bold">{getAvailableStock()}</span> units
                </p>
              </div>
            </div>
            <div className="flex space-x-3 mt-8">
              <button
                onClick={handleDistribute}
                className="btn-primary flex-1"
              >
                Distribute Stock
              </button>
              <button
                onClick={() => setShowDistribution(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stores.map(store => {
          const storeStock = getStoreStock(store.id);
          const inventoryItems = Object.keys(store.inventory).length;

          return (
            <div key={store.id} className="card-modern relative overflow-hidden group hover:scale-105 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 gradient-yellow"></div>
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center shadow-yellow-glow group-hover:animate-pulse-yellow">
                      <Store className="w-8 h-8 text-brand-black" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-brand-black">{store.name}</h3>
                      <p className="text-modern-600 font-medium">{store.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end space-x-1 text-accent-success mb-1">
                      <TrendingUp size={18} />
                      <span className="text-2xl font-bold">{storeStock}</span>
                    </div>
                    <p className="text-xs text-modern-500 font-medium uppercase tracking-wider">Total Stock</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-modern-200">
                    <span className="text-sm font-bold text-brand-black uppercase tracking-wider">Product Lines</span>
                    <span className="text-lg font-bold text-brand-black bg-brand-yellow/10 px-3 py-1 rounded-lg">{inventoryItems}</span>
                  </div>

                  <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                    {Object.entries(store.inventory).map(([productKey, quantity]) => {
                      const [categoryId, variantId, colorId, sizeId] = productKey.split('-');
                      const category = categories.find(c => c.id === categoryId);
                      const variant = category?.variants.find(v => v.id === variantId);
                      const color = variant?.colors.find(c => c.id === colorId);
                      const size = sizes.find(s => s.id === sizeId);

                      if (!category || !variant || !color || !size) return null;

                      return (
                        <div key={productKey} className="flex items-center justify-between p-3 bg-modern-50 rounded-xl border border-modern-200 hover:bg-brand-yellow/5 hover:border-brand-yellow/20 transition-all duration-200">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-4 h-4 rounded-full border border-modern-300"
                              style={{ backgroundColor: color.hex }}
                            ></div>
                            <span className="text-sm font-medium text-brand-black truncate">
                              {variant.name} • {color.name} • {size.name}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-brand-black bg-brand-white px-2 py-1 rounded-lg shadow-modern">{quantity}</span>
                        </div>
                      );
                    })}
                  </div>

                  {inventoryItems === 0 && (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-modern-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Package className="w-6 h-6 text-modern-400" />
                      </div>
                      <p className="text-modern-600 font-medium">No inventory distributed yet</p>
                      <p className="text-modern-500 text-sm">Use "Distribute Stock" to add items</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {stores.length === 0 && (
          <div className="col-span-full card-modern text-center py-16">
            <div className="w-24 h-24 gradient-yellow rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-yellow-glow animate-pulse-yellow">
              <Store className="w-12 h-12 text-brand-black" />
            </div>
            <h3 className="text-2xl font-bold text-brand-black mb-3">No Stores Yet</h3>
            <p className="text-modern-600 text-lg mb-8 max-w-md mx-auto">
              Add your first store location to start distributing inventory across your network
            </p>
            <button
              onClick={() => setShowAddStore(true)}
              className="btn-primary text-lg px-8 py-4"
            >
              Add First Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreManagement;