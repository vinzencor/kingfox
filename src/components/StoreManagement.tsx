import React, { useState } from 'react';
import { Store, Plus, Send, Package, TrendingUp, User, Mail, Lock, Phone, Trash2, AlertTriangle, Eye, X, MapPin, Calendar, Shield, CreditCard } from 'lucide-react';
import { useSupabaseInventory } from '../context/SupabaseInventoryContext';
import { supabase } from '../lib/supabase';

function StoreManagement() {
  const { categories, stores, sizes, loading, error, addStore, distributeToStore, getStoreStock, sizeStock, refreshData } = useSupabaseInventory();
  const [showAddStore, setShowAddStore] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    location: '',
    email: '',
    phone: '',
    managerName: '',
    managerEmail: '',
    managerPassword: ''
  });
  const [distributionData, setDistributionData] = useState({
    storeId: '',
    categoryId: '',
    variantId: '',
    colorId: '',
    sizeId: '',
    quantity: 0
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [storeDetails, setStoreDetails] = useState<any>(null);
  const [showPasswordReset, setShowPasswordReset] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [distributing, setDistributing] = useState(false);

  const handleAddStore = async () => {
    if (newStore.name.trim() && newStore.location.trim() &&
        newStore.managerName.trim() && newStore.managerEmail.trim() &&
        newStore.managerPassword.trim()) {
      try {
        // Generate a unique store code
        const storeCode = `STORE${Date.now().toString().slice(-6)}`;

        // First create the store
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .insert([{
            name: newStore.name,
            location: newStore.location,
            email: newStore.email || null,
            phone: newStore.phone || null,
            store_code: storeCode,
            is_active: true
          }])
          .select()
          .single();

        if (storeError) {
          console.error('Store creation error:', storeError);
          throw storeError;
        }

        // Then create the store user
        const { error: userError } = await supabase.rpc('create_store_user', {
          p_store_id: storeData.id,
          p_email: newStore.managerEmail,
          p_password: newStore.managerPassword,
          p_name: newStore.managerName,
          p_role: 'manager'
        });

        if (userError) {
          console.error('Store user creation error:', userError);
          throw userError;
        }

        console.log('Store created successfully:', storeData);

        // Refresh the stores list without reloading the page
        await refreshData(); // Use the context's refreshData function

        setNewStore({
          name: '',
          location: '',
          email: '',
          phone: '',
          managerName: '',
          managerEmail: '',
          managerPassword: ''
        });
        setShowAddStore(false);
      } catch (error) {
        console.error('Error adding store:', error);
        alert('Error creating store: ' + (error as any).message);
      }
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    try {
      // Call the delete function in Supabase
      const { error } = await supabase.rpc('delete_store_with_dependencies', {
        p_store_id: storeId
      });

      if (error) throw error;

      // Refresh the data
      await refreshData();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting store:', error);
      alert('Error deleting store: ' + (error as any).message);
    }
  };

  const handleViewStoreDetails = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          store_users (
            id,
            email,
            name,
            role,
            is_active,
            last_login,
            created_at
          ),
          store_gst_settings (
            gst_rate,
            gst_number,
            is_gst_enabled
          )
        `)
        .eq('id', storeId)
        .single();

      if (error) throw error;

      setStoreDetails(data);
      setSelectedStore(storeId);
    } catch (err: any) {
      console.error('Error fetching store details:', err);
      alert('Failed to load store details. Please try again.');
    }
  };

  const handlePasswordReset = async (userEmail: string) => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('reset_store_user_password', {
        p_email: userEmail,
        p_new_password: newPassword
      });

      if (error) throw error;

      if (data) {
        alert('Password reset successfully!');
        setShowPasswordReset(null);
        setNewPassword('');
      } else {
        alert('User not found or inactive');
      }
    } catch (err: any) {
      console.error('Error resetting password:', err);
      alert('Failed to reset password. Please try again.');
    }
  };

  const handleDistribute = async () => {
    const { storeId, variantId, colorId, sizeId, quantity } = distributionData;

    // Validation
    if (!storeId) {
      alert('Please select a store');
      return;
    }
    if (!variantId) {
      alert('Please select a variant');
      return;
    }
    if (!colorId) {
      alert('Please select a color');
      return;
    }
    if (!sizeId) {
      alert('Please select a size');
      return;
    }
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const availableStock = getAvailableStock();
    if (quantity > availableStock) {
      alert(`Insufficient stock. Available: ${availableStock} units`);
      return;
    }

    try {
      setDistributing(true);

      // Get store and product names for confirmation
      const store = stores.find(s => s.id === storeId);
      const category = categories.find(c => c.id === distributionData.categoryId);
      const variant = category?.variants.find(v => v.id === variantId);
      const color = variant?.colors.find(c => c.id === colorId);
      const size = sizes.find(s => s.id === sizeId);

      console.log('Distributing stock:', {
        store: store?.name,
        variant: variant?.name,
        color: color?.name,
        size: size?.name,
        quantity
      });

      await distributeToStore(storeId, variantId, colorId, sizeId, quantity);

      // Success feedback
      alert(`Successfully distributed ${quantity} units of ${variant?.name} (${color?.name}, ${size?.name}) to ${store?.name}`);

      // Reset form
      setDistributionData({
        storeId: '',
        categoryId: '',
        variantId: '',
        colorId: '',
        sizeId: '',
        quantity: 0
      });
      setShowDistribution(false);

      // Refresh data to show updated inventory
      await refreshData();

    } catch (error: any) {
      console.error('Error distributing stock:', error);
      alert(`Failed to distribute stock: ${error.message || 'Unknown error'}`);
    } finally {
      setDistributing(false);
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
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Store Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-brand-black uppercase tracking-wider border-b border-modern-100 pb-2">Store Information</h4>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="w-4 h-4 text-modern-400" />
                      </div>
                      <input
                        type="email"
                        value={newStore.email}
                        onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                        placeholder="store@example.com"
                        className="input-modern pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Phone</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="w-4 h-4 text-modern-400" />
                      </div>
                      <input
                        type="tel"
                        value={newStore.phone}
                        onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        className="input-modern pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Manager Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-brand-black uppercase tracking-wider border-b border-modern-100 pb-2">Store Manager</h4>
                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Manager Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-modern-400" />
                    </div>
                    <input
                      type="text"
                      value={newStore.managerName}
                      onChange={(e) => setNewStore({ ...newStore, managerName: e.target.value })}
                      placeholder="Manager full name"
                      className="input-modern pl-10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Manager Email *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-modern-400" />
                    </div>
                    <input
                      type="email"
                      value={newStore.managerEmail}
                      onChange={(e) => setNewStore({ ...newStore, managerEmail: e.target.value })}
                      placeholder="manager@example.com"
                      className="input-modern pl-10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Manager Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-modern-400" />
                    </div>
                    <input
                      type="password"
                      value={newStore.managerPassword}
                      onChange={(e) => setNewStore({ ...newStore, managerPassword: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="input-modern pl-10"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
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
                    {sizes.map(size => {
                      // Find the stock for this specific variant, color, and size combination
                      const stockRecord = sizeStock.find(stock =>
                        stock.variant_id === distributionData.variantId &&
                        stock.color_id === distributionData.colorId &&
                        stock.size_id === size.id
                      );
                      const availableStock = stockRecord ? stockRecord.warehouse_stock : 0;

                      return (
                        <option key={size.id} value={size.id}>
                          {size.name} (Available: {availableStock})
                        </option>
                      );
                    })}
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
                disabled={distributing}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {distributing ? 'Distributing...' : 'Distribute Stock'}
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
            <div key={store.id} className="card-modern relative overflow-hidden group hover:scale-105 transition-all duration-300 cursor-pointer" onClick={() => handleViewStoreDetails(store.id)}>
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
                    <div className="flex items-center justify-end space-x-2 mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewStoreDetails(store.id);
                        }}
                        className="w-8 h-8 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors duration-200 group"
                        title="View Store Details"
                      >
                        <Eye className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(store.id);
                        }}
                        className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors duration-200 group"
                        title="Delete Store"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                      </button>
                    </div>
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

      {/* Store Details Modal */}
      {selectedStore && storeDetails && (
        <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-brand-white rounded-3xl shadow-modern-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-brand-white rounded-t-3xl border-b border-modern-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center">
                    <Store className="w-6 h-6 text-brand-black" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-brand-black">{storeDetails.name}</h3>
                    <p className="text-modern-600 font-medium">{storeDetails.location}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStore(null);
                    setStoreDetails(null);
                  }}
                  className="w-10 h-10 bg-modern-100 hover:bg-modern-200 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-modern-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Store Information */}
              <div className="card-modern">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-bold text-brand-black">Store Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-modern-600" />
                    <div>
                      <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Location</p>
                      <p className="font-semibold text-brand-black">{storeDetails.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                    <Package className="w-5 h-5 text-modern-600" />
                    <div>
                      <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Store Code</p>
                      <p className="font-semibold text-brand-black">{storeDetails.store_code}</p>
                    </div>
                  </div>
                  {storeDetails.phone && (
                    <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                      <Phone className="w-5 h-5 text-modern-600" />
                      <div>
                        <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Phone</p>
                        <p className="font-semibold text-brand-black">{storeDetails.phone}</p>
                      </div>
                    </div>
                  )}
                  {storeDetails.email && (
                    <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                      <Mail className="w-5 h-5 text-modern-600" />
                      <div>
                        <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Email</p>
                        <p className="font-semibold text-brand-black">{storeDetails.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                    <Calendar className="w-5 h-5 text-modern-600" />
                    <div>
                      <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Created</p>
                      <p className="font-semibold text-brand-black">
                        {new Date(storeDetails.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manager Information */}
              {storeDetails.store_users && storeDetails.store_users.length > 0 && (
                <div className="card-modern">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <h4 className="text-lg font-bold text-brand-black">Manager Information</h4>
                  </div>
                  <div className="space-y-4">
                    {storeDetails.store_users.map((user: any, index: number) => (
                      <div key={user.id} className="border border-modern-200 rounded-xl p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                            <User className="w-5 h-5 text-modern-600" />
                            <div>
                              <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Name</p>
                              <p className="font-semibold text-brand-black">{user.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                            <Mail className="w-5 h-5 text-modern-600" />
                            <div>
                              <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Email</p>
                              <p className="font-semibold text-brand-black">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                            <Shield className="w-5 h-5 text-modern-600" />
                            <div>
                              <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Role</p>
                              <p className="font-semibold text-brand-black capitalize">{user.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                            <div className={`w-5 h-5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <div>
                              <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Status</p>
                              <p className={`font-semibold ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                            <Calendar className="w-5 h-5 text-modern-600" />
                            <div>
                              <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Last Login</p>
                              <p className="font-semibold text-brand-black">
                                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                            <Calendar className="w-5 h-5 text-modern-600" />
                            <div>
                              <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">Created</p>
                              <p className="font-semibold text-brand-black">
                                {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-modern-200">
                          <button
                            onClick={() => setShowPasswordReset(user.email)}
                            className="btn-outline text-sm flex items-center space-x-2"
                          >
                            <Lock className="w-4 h-4" />
                            <span>Reset Password</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GST Settings */}
              {storeDetails.store_gst_settings && storeDetails.store_gst_settings.length > 0 && (
                <div className="card-modern">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-bold text-brand-black">GST Settings</h4>
                  </div>
                  {storeDetails.store_gst_settings.map((gst: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                        <div className={`w-5 h-5 rounded-full ${gst.is_gst_enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">GST Status</p>
                          <p className={`font-semibold ${gst.is_gst_enabled ? 'text-green-600' : 'text-red-600'}`}>
                            {gst.is_gst_enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                        <CreditCard className="w-5 h-5 text-modern-600" />
                        <div>
                          <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">GST Rate</p>
                          <p className="font-semibold text-brand-black">{gst.gst_rate}%</p>
                        </div>
                      </div>
                      {gst.gst_number && (
                        <div className="flex items-center space-x-3 p-3 bg-modern-50 rounded-xl">
                          <Package className="w-5 h-5 text-modern-600" />
                          <div>
                            <p className="text-xs text-modern-500 uppercase tracking-wider font-medium">GST Number</p>
                            <p className="font-semibold text-brand-black">{gst.gst_number}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-brand-white rounded-3xl shadow-modern-xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-brand-black mb-2">Reset Password</h3>
              <p className="text-modern-600 mb-6">
                Enter a new password for <strong>{showPasswordReset}</strong>
              </p>

              <div className="mb-6">
                <label className="block text-sm font-bold text-brand-black mb-2 text-left">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-modern-400" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="input-modern pl-10 w-full"
                    minLength={6}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordReset(null);
                    setNewPassword('');
                  }}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePasswordReset(showPasswordReset)}
                  className="btn-primary flex-1"
                  disabled={!newPassword || newPassword.length < 6}
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-white rounded-3xl shadow-modern-xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-brand-black mb-2">Delete Store</h3>
              <p className="text-modern-600 mb-6">
                Are you sure you want to delete this store? This will permanently remove:
              </p>
              <div className="text-left bg-red-50 rounded-xl p-4 mb-6">
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Store information and settings</li>
                  <li>• All store inventory records</li>
                  <li>• Store manager accounts</li>
                  <li>• Sales transaction history</li>
                  <li>• All audit logs</li>
                </ul>
              </div>
              <p className="text-sm text-red-600 font-medium mb-6">
                This action cannot be undone!
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteStore(deleteConfirm)}
                  className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 flex-1"
                >
                  Delete Store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoreManagement;