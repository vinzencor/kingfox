import React, { useState, useRef, useEffect } from 'react';
import { Package, Edit3, Save, X, Plus, Barcode, Printer } from 'lucide-react';
import { useSupabaseInventory } from '../context/SupabaseInventoryContext';
import JsBarcode from 'jsbarcode';

interface SizeStockManagementProps {
  selectedCategory: string;
  selectedVariant: string;
  selectedColor: string;
}

function SizeStockManagement({ selectedCategory, selectedVariant, selectedColor }: SizeStockManagementProps) {
  const { categories, sizes, loading, addSizeStock, updateSizeStock } = useSupabaseInventory();
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ barcode: string; price: number; stock: number }>({
    barcode: '',
    price: 0,
    stock: 0
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStock, setNewStock] = useState<{
    size_id: string;
    barcode: string;
    price: number;
    stock: number;
  }>({
    size_id: '',
    barcode: '',
    price: 0,
    stock: 0
  });

  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);
  const selectedVariantData = selectedCategoryData?.variants.find(v => v.id === selectedVariant);
  const selectedColorData = selectedVariantData?.colors.find(c => c.id === selectedColor);

  // Get existing size stock for this variant-color combination
  const existingSizeStock = selectedVariantData?.sizeStock?.filter(
    stock => stock.color_id === selectedColor
  ) || [];

  const generateBarcode = (sizeId: string) => {
    // Generate a compact barcode like the second image (12 digits for CODE128)
    const timestamp = Date.now().toString().slice(-4);
    const sizeCode = sizeId.toUpperCase().charCodeAt(0).toString().slice(-2);
    const variantCode = selectedVariant.slice(-2).replace(/[^0-9]/g, '').padStart(2, '0');
    const colorCode = selectedColor.slice(-2).replace(/[^0-9]/g, '').padStart(2, '0');
    const fullCode = `${variantCode}${colorCode}${sizeCode}${timestamp}`;
    // Generate 12-digit barcode for compact CODE128 display
    return fullCode.replace(/[^0-9]/g, '').padEnd(12, '0').slice(0, 12);
  };

  const renderBarcode = (barcodeValue: string, canvasId: string) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (canvas && barcodeValue) {
      try {
        // Use CODE128 for compact barcode like the second image
        JsBarcode(canvas, barcodeValue, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 5,
          background: "#ffffff",
          lineColor: "#000000"
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  };

  const handleAddStock = async () => {
    if (!newStock.size_id || !newStock.barcode || newStock.price <= 0) return;

    try {
      await addSizeStock(
        selectedVariant,
        selectedColor,
        newStock.size_id,
        newStock.barcode,
        newStock.price,
        newStock.stock
      );
      
      setNewStock({ size_id: '', barcode: '', price: 0, stock: 0 });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding size stock:', error);
    }
  };

  const handleUpdateStock = async (stockId: string) => {
    try {
      await updateSizeStock(stockId, {
        barcode: editValues.barcode,
        price: editValues.price,
        warehouse_stock: editValues.stock
      });
      
      setEditingStock(null);
    } catch (error) {
      console.error('Error updating size stock:', error);
    }
  };

  const startEditing = (stock: any) => {
    setEditingStock(stock.id);
    setEditValues({
      barcode: stock.barcode,
      price: stock.price,
      stock: stock.warehouse_stock
    });
  };

  useEffect(() => {
    // Render barcodes for existing stock
    existingSizeStock.forEach((stock, index) => {
      setTimeout(() => renderBarcode(stock.barcode, `barcode-${stock.id}`), 100);
    });
  }, [existingSizeStock]);

  if (!selectedColor || !selectedColorData) {
    return (
      <div className="card-modern text-center py-12">
        <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-yellow-glow">
          <Package className="w-8 h-8 text-brand-black" />
        </div>
        <h3 className="text-xl font-bold text-brand-black mb-2">Select Product Details</h3>
        <p className="text-modern-600">Choose a category, variant, and color to manage individual size stock</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 gradient-black rounded-xl flex items-center justify-center shadow-modern">
            <Barcode className="w-6 h-6 text-brand-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-black">
              {selectedVariantData?.name} - {selectedColorData.name}
            </h3>
            <p className="text-modern-600 text-sm">Individual size stock management with barcodes</p>
          </div>
        </div>
        <div
          className="w-8 h-8 rounded-xl border-2 border-modern-300 shadow-modern"
          style={{ backgroundColor: selectedColorData.hex }}
        ></div>
      </div>

      {/* Add New Size Stock */}
      {showAddForm ? (
        <div className="card-modern border-2 border-brand-yellow/30 bg-brand-yellow/5">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-brand-black">Add New Size Stock</h4>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 hover:bg-modern-100 rounded-lg transition-colors duration-200"
            >
              <X size={20} className="text-modern-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2">Size</label>
              <select
                value={newStock.size_id}
                onChange={(e) => setNewStock(prev => ({ ...prev, size_id: e.target.value }))}
                className="input-modern"
              >
                <option value="">Select Size</option>
                {sizes.map(size => (
                  <option key={size.id} value={size.id}>{size.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-black mb-2">Barcode</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newStock.barcode}
                  onChange={(e) => setNewStock(prev => ({ ...prev, barcode: e.target.value }))}
                  className="input-modern flex-1"
                  placeholder="Enter barcode"
                />
                <button
                  onClick={() => setNewStock(prev => ({ 
                    ...prev, 
                    barcode: generateBarcode(prev.size_id) 
                  }))}
                  className="px-3 py-2 bg-brand-yellow text-brand-black rounded-lg hover:bg-brand-yellow-dark transition-colors duration-200"
                  title="Generate barcode"
                >
                  <Barcode size={16} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-black mb-2">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={newStock.price}
                onChange={(e) => setNewStock(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="input-modern"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-black mb-2">Stock Quantity</label>
              <input
                type="number"
                value={newStock.stock}
                onChange={(e) => setNewStock(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                className="input-modern"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-modern-600 hover:text-modern-800 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddStock}
              disabled={!newStock.size_id || !newStock.barcode || newStock.price <= 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Size Stock
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full p-4 border-2 border-dashed border-modern-300 rounded-2xl hover:border-brand-yellow/50 hover:bg-brand-yellow/5 transition-all duration-200 group"
        >
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 bg-modern-100 group-hover:bg-brand-yellow/20 rounded-xl flex items-center justify-center transition-colors duration-200">
              <Plus className="w-6 h-6 text-modern-600 group-hover:text-brand-black" />
            </div>
            <div>
              <p className="text-lg font-bold text-brand-black">Add Size Stock</p>
              <p className="text-modern-600 text-sm">Create individual stock entry with barcode</p>
            </div>
          </div>
        </button>
      )}

      {/* Existing Size Stock */}
      <div className="space-y-4">
        {existingSizeStock.length === 0 ? (
          <div className="card-modern text-center py-12">
            <div className="w-16 h-16 bg-modern-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-modern-400" />
            </div>
            <p className="text-modern-600 font-medium">No size stock created yet</p>
            <p className="text-modern-500 text-sm">Add individual size stock entries above</p>
          </div>
        ) : (
          existingSizeStock.map((stock) => {
            const sizeData = sizes.find(s => s.id === stock.size_id);
            const isEditing = editingStock === stock.id;

            return (
              <div key={stock.id} className="card-modern hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-yellow-glow">
                      <span className="text-lg font-bold text-brand-black">
                        {sizeData?.name.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-brand-black">Size {sizeData?.name.toUpperCase()}</h4>
                      <p className="text-modern-600 text-sm">Individual stock management</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!isEditing && (
                      <button
                        onClick={() => startEditing(stock)}
                        className="p-2 hover:bg-modern-100 rounded-lg transition-colors duration-200"
                        title="Edit stock"
                      >
                        <Edit3 size={16} className="text-modern-600" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Stock Details */}
                  <div className="space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-brand-black mb-2">Barcode</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={editValues.barcode}
                              onChange={(e) => setEditValues(prev => ({ ...prev, barcode: e.target.value }))}
                              className="input-modern flex-1"
                            />
                            <button
                              onClick={() => setEditValues(prev => ({
                                ...prev,
                                barcode: generateBarcode(stock.size_id)
                              }))}
                              className="px-3 py-2 bg-brand-yellow text-brand-black rounded-lg hover:bg-brand-yellow-dark transition-colors duration-200"
                              title="Generate new ITF barcode"
                            >
                              <Barcode size={16} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-brand-black mb-2">Price ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.price}
                            onChange={(e) => setEditValues(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                            className="input-modern"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-brand-black mb-2">Stock</label>
                          <input
                            type="number"
                            value={editValues.stock}
                            onChange={(e) => setEditValues(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                            className="input-modern"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateStock(stock.id)}
                            className="btn-primary flex-1"
                          >
                            <Save size={16} className="mr-2" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStock(null)}
                            className="px-4 py-2 text-modern-600 hover:text-modern-800 transition-colors duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 bg-modern-50 rounded-xl">
                          <span className="text-sm font-medium text-modern-600">Barcode</span>
                          <span className="font-mono text-brand-black">{stock.barcode}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-modern-50 rounded-xl">
                          <span className="text-sm font-medium text-modern-600">Price</span>
                          <span className="text-xl font-bold text-brand-black">${stock.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-modern-50 rounded-xl">
                          <span className="text-sm font-medium text-modern-600">Stock</span>
                          <span className="text-xl font-bold text-brand-black">{stock.warehouse_stock}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Barcode Display */}
                  <div className="flex flex-col items-center justify-center p-4 bg-brand-white rounded-xl border border-modern-200">
                    <canvas
                      id={`barcode-${stock.id}`}
                      className="mb-3"
                    ></canvas>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center space-x-2 px-3 py-2 bg-modern-100 hover:bg-modern-200 rounded-lg transition-colors duration-200"
                    >
                      <Printer size={16} className="text-modern-600" />
                      <span className="text-sm font-medium text-modern-600">Print</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SizeStockManagement;
