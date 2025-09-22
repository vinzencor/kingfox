import React, { useState, useEffect } from 'react';
import { BarChart3, Package, ChevronDown, ChevronRight, Barcode } from 'lucide-react';
import { useSupabaseInventory } from '../context/SupabaseInventoryContext';
import JsBarcode from 'jsbarcode';

function BarcodeManagement() {
  const { categories, sizes, loading, error, sizeStock } = useSupabaseInventory();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Effect to render barcodes when products are expanded
  useEffect(() => {
    if (!sizeStock) return;

    expandedProducts.forEach(productKey => {
      const [variantId, colorId] = productKey.split('-');
      const productBarcodes = getProductBarcodes(variantId, colorId);

      productBarcodes.forEach(stock => {
        const canvasId = `barcode-${stock.id}`;
        setTimeout(() => renderBarcode(stock.barcode, canvasId), 100);
      });
    });
  }, [expandedProducts, sizeStock]);

  const toggleProductExpansion = (productKey: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productKey)) {
        newSet.delete(productKey);
      } else {
        newSet.add(productKey);
      }
      return newSet;
    });
  };

  const renderBarcode = (barcodeValue: string, canvasId: string) => {
    setTimeout(() => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (canvas && barcodeValue) {
        try {
          JsBarcode(canvas, barcodeValue, {
            format: "CODE128",
            width: 2,
            height: 40,
            displayValue: true,
            fontSize: 12,
            margin: 5,
            background: "#ffffff",
            lineColor: "#000000"
          });
        } catch (error) {
          console.error('Error generating barcode:', error);
        }
      }
    }, 100);
  };

  const getProductBarcodes = (variantId: string, colorId: string) => {
    if (!sizeStock || !Array.isArray(sizeStock)) return [];
    return sizeStock.filter(stock =>
      stock.variant_id === variantId && stock.color_id === colorId
    );
  };

  if (loading || !sizeStock) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-yellow">
            <BarChart3 className="w-8 h-8 text-brand-black" />
          </div>
          <p className="text-modern-600 font-medium">Loading barcode data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-modern text-center py-16">
        <div className="w-16 h-16 bg-accent-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-accent-error" />
        </div>
        <h3 className="text-xl font-bold text-brand-black mb-2">Error Loading Barcodes</h3>
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
          Barcode <span className="text-gradient-yellow">Studio</span>
        </h2>
        <p className="text-modern-600 text-lg font-medium">View individual size barcodes by clicking on products</p>
      </div>



      {/* Categories and Barcode Groups */}
      <div className="space-y-8">
        {categories.map(category => (
          <div key={category.id} className="card-modern relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 gradient-black"></div>
            <div className="p-8 border-b border-modern-100">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center shadow-yellow-glow group-hover:animate-pulse-yellow">
                  <Package className="w-8 h-8 text-brand-black" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-brand-black">{category.name}</h3>
                  <p className="text-modern-600 font-medium">{category.variants.length} variants with barcode groups</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {category.variants.map(variant => (
                <div key={variant.id} className="bg-modern-50 rounded-2xl border border-modern-200 overflow-hidden">
                  {variant.colors.map(color => {
                    const productKey = `${variant.id}-${color.id}`;
                    const isExpanded = expandedProducts.has(productKey);
                    const productBarcodes = getProductBarcodes(variant.id, color.id);

                    return (
                      <div key={color.id} className="border-b border-modern-200 last:border-b-0">
                        {/* Product Header - Clickable */}
                        <button
                          onClick={() => toggleProductExpansion(productKey)}
                          className="w-full p-6 text-left hover:bg-modern-100 transition-colors duration-200 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              {isExpanded ? (
                                <ChevronDown size={20} className="text-modern-600" />
                              ) : (
                                <ChevronRight size={20} className="text-modern-600" />
                              )}
                              <div
                                className="w-6 h-6 rounded-full border-2 border-modern-300 shadow-sm"
                                style={{ backgroundColor: color.hex_code }}
                              ></div>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-brand-black">{variant.name} - {color.name}</h4>
                              <p className="text-modern-600 text-sm font-medium">
                                {productBarcodes.length} barcode{productBarcodes.length !== 1 ? 's' : ''} available
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Barcode size={20} className="text-modern-400" />
                            <span className="text-sm text-modern-600 font-medium">
                              Click to {isExpanded ? 'hide' : 'show'} barcodes
                            </span>
                          </div>
                        </button>

                        {/* Expanded Barcode List */}
                        {isExpanded && (
                          <div className="px-6 pb-6 bg-brand-white">
                            {productBarcodes.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {productBarcodes.map(stock => {
                                  const size = sizes.find(s => s.id === stock.size_id);
                                  const canvasId = `barcode-${stock.id}`;

                                  return (
                                    <div key={stock.id} className="bg-modern-50 rounded-xl p-4 border border-modern-200">
                                      <div className="text-center mb-3">
                                        <div className="flex items-center justify-center space-x-2 mb-2">
                                          <span className="text-sm font-bold text-brand-black uppercase tracking-wider">
                                            Size {size?.name || stock.size_id}
                                          </span>
                                          <span className="px-2 py-1 bg-brand-yellow rounded-full text-xs font-bold text-brand-black">
                                            ${stock.price}
                                          </span>
                                        </div>
                                        <canvas
                                          id={canvasId}
                                          className="mx-auto mb-2"
                                        ></canvas>
                                        <p className="text-xs font-mono text-modern-600 tracking-wider">
                                          {stock.barcode}
                                        </p>
                                        <p className="text-xs text-modern-500 mt-1">
                                          Stock: {stock.warehouse_stock} units
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <div className="w-12 h-12 bg-modern-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                  <Barcode className="w-6 h-6 text-modern-400" />
                                </div>
                                <p className="text-modern-600 font-medium">No barcodes found</p>
                                <p className="text-modern-500 text-sm">Create individual size stock in Product Management</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {category.variants.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-modern-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-modern-400" />
                  </div>
                  <p className="text-modern-600 font-medium">No variants available</p>
                  <p className="text-modern-500 text-sm">Add variants in Product Management first</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="card-modern text-center py-16">
            <div className="w-24 h-24 gradient-yellow rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-yellow-glow animate-pulse-yellow">
              <BarChart3 className="w-12 h-12 text-brand-black" />
            </div>
            <h3 className="text-2xl font-bold text-brand-black mb-3">No Products Available</h3>
            <p className="text-modern-600 text-lg mb-8 max-w-md mx-auto">
              Create product categories and variants first to manage barcodes
            </p>
            <button
              onClick={() => window.location.href = '#products'}
              className="btn-primary text-lg px-8 py-4"
            >
              Go to Product Management
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BarcodeManagement;