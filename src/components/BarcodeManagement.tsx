import React, { useState, useEffect } from 'react';
import { BarChart3, Package, ChevronDown, ChevronRight, Barcode } from 'lucide-react';
import { useSupabaseInventory } from '../context/SupabaseInventoryContext';
import JsBarcode from 'jsbarcode';

function BarcodeManagement() {
  const { categories, sizes, loading, error, sizeStock } = useSupabaseInventory();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Debug logging
  useEffect(() => {
    console.log('🔍 BarcodeManagement Debug Info:');
    console.log('- Loading:', loading);
    console.log('- Error:', error);
    console.log('- Categories:', categories?.length || 0);
    console.log('- SizeStock:', sizeStock?.length || 0);
    console.log('- SizeStock data:', sizeStock);
    console.log('- Expanded products:', Array.from(expandedProducts));

    // Check if we have any data at all
    if (sizeStock && sizeStock.length > 0) {
      console.log('✅ SizeStock data available:', sizeStock[0]);
    } else {
      console.log('❌ No SizeStock data available');
    }
  }, [categories, sizeStock, expandedProducts, loading, error]);

  // Effect to render barcodes when products are expanded
  useEffect(() => {
    if (!sizeStock || expandedProducts.size === 0) return;

    console.log('🎨 Triggering barcode rendering for expanded products:', Array.from(expandedProducts));

    // Use a longer timeout to ensure DOM elements are ready
    const timeoutId = setTimeout(() => {
      expandedProducts.forEach(productKey => {
        const [variantId, colorId] = productKey.split('-');
        const productBarcodes = getProductBarcodes(variantId, colorId);

        console.log(`📦 Rendering barcodes for ${productKey}:`, productBarcodes.length);

        productBarcodes.forEach(stock => {
          const canvasId = `barcode-${stock.id}`;
          console.log(`🎯 Attempting to render barcode: ${stock.barcode} on canvas: ${canvasId}`);
          renderBarcode(stock.barcode, canvasId);
        });
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [expandedProducts, sizeStock]);

  // Additional effect to re-render barcodes when sizeStock changes
  useEffect(() => {
    if (sizeStock && sizeStock.length > 0 && expandedProducts.size > 0) {
      console.log('🔄 SizeStock data updated, re-rendering visible barcodes');
      setTimeout(() => {
        reRenderAllBarcodes();
      }, 500);
    }
  }, [sizeStock]);

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
    // Try multiple times to find the canvas element
    let attempts = 0;
    const maxAttempts = 15;

    const tryRender = () => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

      if (canvas && barcodeValue) {
        try {
          // Ensure canvas has proper dimensions
          canvas.width = 200;
          canvas.height = 80;

          // Clear any existing content
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Set white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          // Validate barcode value
          if (!barcodeValue || barcodeValue.trim() === '') {
            throw new Error('Empty barcode value');
          }

          console.log(`🎯 Rendering barcode: "${barcodeValue}" on canvas: ${canvasId}`);

          // Render barcode with JsBarcode
          JsBarcode(canvas, barcodeValue.trim(), {
            format: "CODE128",
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: 14,
            margin: 10,
            background: "#ffffff",
            lineColor: "#000000",
            textAlign: "center",
            textPosition: "bottom"
          });

          console.log(`✅ Barcode rendered successfully for ${canvasId}: ${barcodeValue}`);

          // Verify the canvas has content
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          const hasContent = imageData?.data.some((pixel, index) => index % 4 < 3 && pixel < 255);
          console.log(`📊 Canvas has content: ${hasContent}`);

          // Force a repaint
          canvas.style.display = 'none';
          canvas.offsetHeight; // Trigger reflow
          canvas.style.display = 'block';

        } catch (error) {
          console.error(`❌ Error rendering barcode for ${canvasId}:`, error);

          // Fallback: draw a simple rectangle as placeholder
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Barcode Error', canvas.width / 2, canvas.height / 2 - 10);
            ctx.fillText(barcodeValue || 'N/A', canvas.width / 2, canvas.height / 2 + 10);
          }
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        console.log(`⏳ Canvas not ready for ${canvasId}, attempt ${attempts}/${maxAttempts}`);
        setTimeout(tryRender, 150);
      } else {
        console.error(`❌ Failed to find canvas element: ${canvasId} after ${maxAttempts} attempts`);
        console.log('Available elements:', document.querySelectorAll(`[id*="barcode"]`));
      }
    };

    // Start rendering after a short delay
    setTimeout(tryRender, 100);
  };

  const getProductBarcodes = (variantId: string, colorId: string) => {
    if (!sizeStock || !Array.isArray(sizeStock)) return [];
    return sizeStock.filter(stock =>
      stock.variant_id === variantId && stock.color_id === colorId
    );
  };

  // Function to manually re-render all visible barcodes
  const reRenderAllBarcodes = () => {
    console.log('🔄 Re-rendering all visible barcodes...');
    expandedProducts.forEach(productKey => {
      const [variantId, colorId] = productKey.split('-');
      const productBarcodes = getProductBarcodes(variantId, colorId);

      productBarcodes.forEach(stock => {
        const canvasId = `barcode-${stock.id}`;
        setTimeout(() => renderBarcode(stock.barcode, canvasId), 50);
      });
    });
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold text-brand-black mb-3">
              Barcode <span className="text-gradient-yellow">Studio</span>
            </h2>
            <p className="text-modern-600 text-lg font-medium">View individual size barcodes by clicking on products</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={reRenderAllBarcodes}
              className="px-4 py-2 bg-brand-yellow text-brand-black rounded-lg hover:bg-yellow-400 transition-colors duration-200 font-medium"
            >
              🔄 Re-render Barcodes
            </button>
            <button
              onClick={() => {
                const testCanvas = document.getElementById('test-barcode') as HTMLCanvasElement;
                if (testCanvas) {
                  try {
                    JsBarcode(testCanvas, '123456789012', {
                      format: "CODE128",
                      width: 2,
                      height: 50,
                      displayValue: true,
                      fontSize: 12,
                      margin: 10,
                      background: "#ffffff",
                      lineColor: "#000000"
                    });
                    console.log('✅ Test barcode rendered successfully');
                  } catch (error) {
                    console.error('❌ Test barcode failed:', error);
                  }
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium"
            >
              🧪 Test Barcode
            </button>
          </div>
        </div>
      </div>

      {/* Test Barcode Canvas */}
      <div className="card-modern p-4 text-center">
        <h3 className="text-lg font-bold text-brand-black mb-2">Test Barcode (Click "🧪 Test Barcode" to render)</h3>
        <canvas
          id="test-barcode"
          width="200"
          height="80"
          className="mx-auto border border-modern-200 rounded"
        ></canvas>
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
                                          width="200"
                                          height="80"
                                          className="mx-auto mb-2 border border-modern-200 rounded"
                                          style={{ maxWidth: '100%' }}
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