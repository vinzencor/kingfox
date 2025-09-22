import React, { useState } from 'react';
import { Scan, ShoppingCart, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { useSupabaseInventory } from '../context/SupabaseInventoryContext';

function POSSystem() {
  const { stores, loading, error, sellProduct, getProductByBarcode, getStoreStock } = useSupabaseInventory();
  const [selectedStore, setSelectedStore] = useState('');
  const [barcode, setBarcode] = useState('');
  const [lastSale, setLastSale] = useState<{ success: boolean; message: string; product?: any } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    if (!selectedStore || !barcode.trim()) return;

    setIsScanning(true);

    try {
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const product = await getProductByBarcode(barcode);

      if (!product) {
        setLastSale({ success: false, message: 'Product not found' });
        setIsScanning(false);
        return;
      }

      const success = await sellProduct(selectedStore, barcode);

      if (success) {
        setLastSale({
          success: true,
          message: 'Sale completed successfully!',
          product
        });
      } else {
        setLastSale({
          success: false,
          message: 'Insufficient stock in store',
          product
        });
      }

      setBarcode('');
    } catch (error) {
      console.error('Error processing sale:', error);
      setLastSale({
        success: false,
        message: 'Error processing sale. Please try again.'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const selectedStoreData = stores.find(s => s.id === selectedStore);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-yellow">
            <Scan className="w-8 h-8 text-brand-black" />
          </div>
          <p className="text-modern-600 font-medium">Loading POS system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-modern text-center py-16">
        <div className="w-16 h-16 bg-accent-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Scan className="w-8 h-8 text-accent-error" />
        </div>
        <h3 className="text-xl font-bold text-brand-black mb-2">Error Loading POS System</h3>
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
      <div className="text-center lg:text-left">
        <h2 className="text-4xl font-bold text-brand-black mb-3">
          POS <span className="text-gradient-yellow">Terminal</span>
        </h2>
        <p className="text-modern-600 text-lg font-medium">Advanced point of sale barcode scanning system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* POS Interface */}
        <div className="lg:col-span-2 card-modern relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 gradient-black"></div>
          <div className="p-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center shadow-yellow-glow animate-pulse-yellow">
                <Scan className="w-8 h-8 text-brand-black" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-brand-black">Barcode Scanner</h3>
                <p className="text-modern-600 font-medium">Scan products to complete sales transactions</p>
              </div>
            </div>

            {/* Store Selection */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-brand-black mb-3 uppercase tracking-wider">Select Store Location</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="input-modern text-lg"
              >
                <option value="">Choose a store location...</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name} - {store.location}</option>
                ))}
              </select>
            </div>

            {/* Barcode Input */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-brand-black mb-3 uppercase tracking-wider">Product Barcode</label>
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan or enter barcode..."
                    className="input-modern text-lg font-mono tracking-wider"
                    disabled={isScanning}
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className={`w-3 h-3 rounded-full ${barcode ? 'bg-accent-success animate-pulse' : 'bg-modern-300'}`}></div>
                  </div>
                </div>
                <button
                  onClick={handleScan}
                  disabled={!selectedStore || !barcode.trim() || isScanning}
                  className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center space-x-3 ${
                    !selectedStore || !barcode.trim() || isScanning
                      ? 'bg-modern-200 text-modern-500 cursor-not-allowed'
                      : 'btn-primary hover:scale-105'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <div className="w-5 h-5 border-2 border-brand-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Scan size={20} />
                      <span>Process Sale</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sale Result */}
            {lastSale && (
              <div className={`p-6 rounded-2xl border-2 animate-slide-up ${
                lastSale.success
                  ? 'bg-accent-success/5 border-accent-success/20'
                  : 'bg-accent-error/5 border-accent-error/20'
              }`}>
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    lastSale.success
                      ? 'bg-accent-success/10'
                      : 'bg-accent-error/10'
                  }`}>
                    {lastSale.success ? (
                      <CheckCircle className="w-6 h-6 text-accent-success" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-accent-error" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-lg font-bold mb-2 ${
                      lastSale.success ? 'text-accent-success' : 'text-accent-error'
                    }`}>
                      {lastSale.message}
                    </p>
                    {lastSale.product && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-brand-white rounded-xl border border-modern-200">
                          <span className="text-sm font-medium text-modern-600">Product</span>
                          <span className="font-bold text-brand-black">
                            {lastSale.product.categoryName} - {lastSale.product.variantName}
                          </span>
                        </div>
                        {lastSale.product.type === 'size_stock' && (
                          <>
                            <div className="flex items-center justify-between p-3 bg-brand-white rounded-xl border border-modern-200">
                              <span className="text-sm font-medium text-modern-600">Color</span>
                              <span className="font-bold text-brand-black">{lastSale.product.colorName}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-brand-white rounded-xl border border-modern-200">
                              <span className="text-sm font-medium text-modern-600">Size</span>
                              <span className="font-bold text-brand-black">{lastSale.product.sizeName.toUpperCase()}</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between p-3 bg-brand-white rounded-xl border border-modern-200">
                          <span className="text-sm font-medium text-modern-600">Price</span>
                          <span className="text-xl font-bold text-brand-yellow-dark">
                            ${lastSale.product.price.toFixed(2)}
                          </span>
                        </div>
                        {lastSale.product.type === 'barcode_group' && (
                          <div className="flex items-center justify-between p-3 bg-brand-white rounded-xl border border-modern-200">
                            <span className="text-sm font-medium text-modern-600">Sizes</span>
                            <span className="font-bold text-brand-black">
                              {lastSale.product.barcodeGroup.size_ids.join(', ').toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Test Barcodes */}
            <div className="mt-8 p-6 bg-modern-50 rounded-2xl border border-modern-200">
              <h4 className="text-lg font-bold text-brand-black mb-4 uppercase tracking-wider">Quick Test Barcodes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setBarcode('776553601685')}
                  className="p-4 bg-brand-white rounded-xl border-2 border-modern-200 hover:border-brand-yellow/30 hover:bg-brand-yellow/5 text-left transition-all duration-200 group"
                >
                  <p className="font-mono text-lg font-bold text-brand-black mb-1">776553601685</p>
                  <p className="text-sm text-modern-600 font-medium">Polo Red - Size S</p>
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs text-brand-yellow-dark font-medium">Click to use</span>
                  </div>
                </button>
                <button
                  onClick={() => setBarcode('872997470019')}
                  className="p-4 bg-brand-white rounded-xl border-2 border-modern-200 hover:border-brand-yellow/30 hover:bg-brand-yellow/5 text-left transition-all duration-200 group"
                >
                  <p className="font-mono text-lg font-bold text-brand-black mb-1">872997470019</p>
                  <p className="text-sm text-modern-600 font-medium">Polo Blue - Size L</p>
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs text-brand-yellow-dark font-medium">Click to use</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Store Info */}
        <div className="card-modern relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 gradient-yellow"></div>
          <div className="p-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 gradient-black rounded-2xl flex items-center justify-center shadow-modern">
                <ShoppingCart className="w-8 h-8 text-brand-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-brand-black">Store Details</h3>
                <p className="text-modern-600 font-medium">Current location information</p>
              </div>
            </div>

            {selectedStoreData ? (
              <div className="space-y-6">
                <div className="p-6 bg-brand-yellow/5 rounded-2xl border border-brand-yellow/20">
                  <h4 className="text-xl font-bold text-brand-black mb-2">{selectedStoreData.name}</h4>
                  <p className="text-modern-600 font-medium">{selectedStoreData.location}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-modern-50 rounded-xl border border-modern-200">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-brand-black">{getStoreStock(selectedStoreData.id)}</span>
                      <p className="text-sm font-medium text-modern-600 uppercase tracking-wider">Total Inventory</p>
                    </div>
                  </div>
                  <div className="p-4 bg-modern-50 rounded-xl border border-modern-200">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-brand-black">{Object.keys(selectedStoreData.inventory).length}</span>
                      <p className="text-sm font-medium text-modern-600 uppercase tracking-wider">Product Lines</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-lg font-bold text-brand-black mb-4 uppercase tracking-wider">Current Stock</h5>
                  <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                    {Object.entries(selectedStoreData.inventory).map(([productKey, quantity]) => {
                      if (quantity === 0) return null;

                      const [, variantId, colorId, sizeId] = productKey.split('-');
                      return (
                        <div key={productKey} className="flex items-center justify-between p-3 bg-brand-white rounded-xl border border-modern-200 hover:border-brand-yellow/30 transition-all duration-200">
                          <span className="text-sm font-medium text-brand-black truncate">
                            {variantId} • {colorId} • {sizeId.toUpperCase()}
                          </span>
                          <span className="text-lg font-bold text-brand-black bg-brand-yellow/10 px-3 py-1 rounded-lg">{quantity}</span>
                        </div>
                      );
                    })}
                  </div>

                  {Object.keys(selectedStoreData.inventory).length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-modern-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Package className="w-6 h-6 text-modern-400" />
                      </div>
                      <p className="text-modern-600 font-medium">No inventory available</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-modern-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-modern-400" />
                </div>
                <p className="text-modern-600 font-medium">Select a store to view details</p>
                <p className="text-modern-500 text-sm">Store information will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default POSSystem;