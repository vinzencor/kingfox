import React, { useState } from 'react';
import { Plus, Edit3, Package, Palette, Ruler, Trash2, BarChart3, DollarSign, ChevronDown, ChevronRight, Layers, X } from 'lucide-react';
import { useSupabaseInventory } from '../context/SupabaseInventoryContext';
import SizeStockManagement from './SizeStockManagement';

function ProductManagement() {
  const { categories, sizes, loading, error, addCategory, addVariant, addColor, updateStock, addBarcodeGroup } = useSupabaseInventory();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState<string | null>(null);
  const [showAddColor, setShowAddColor] = useState<{ categoryId: string; variantId: string } | null>(null);
  const [showAddBarcode, setShowAddBarcode] = useState<{ categoryId: string; variantId: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newVariantName, setNewVariantName] = useState('');
  const [newColor, setNewColor] = useState({ name: '', hex: '#000000' });
  const [newBarcodeGroup, setNewBarcodeGroup] = useState({
    name: '',
    size_ids: [] as string[],
    price: 0
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showSizeStock, setShowSizeStock] = useState<{
    categoryId: string;
    variantId: string;
    colorId: string;
  } | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      try {
        await addCategory(newCategoryName);
        setNewCategoryName('');
        setShowAddCategory(false);
      } catch (error) {
        console.error('Error adding category:', error);
      }
    }
  };

  const handleAddVariant = async (categoryId: string) => {
    if (newVariantName.trim()) {
      try {
        await addVariant(categoryId, newVariantName);
        setNewVariantName('');
        setShowAddVariant(null);
      } catch (error) {
        console.error('Error adding variant:', error);
      }
    }
  };

  const handleAddColor = async () => {
    if (showAddColor && newColor.name.trim()) {
      try {
        await addColor(showAddColor.categoryId, showAddColor.variantId, newColor);
        setNewColor({ name: '', hex: '#000000' });
        setShowAddColor(null);
      } catch (error) {
        console.error('Error adding color:', error);
      }
    }
  };

  const handleStockUpdate = async (categoryId: string, variantId: string, colorId: string, sizeId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    try {
      await updateStock(categoryId, variantId, colorId, sizeId, quantity);
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const handleAddBarcodeGroup = async () => {
    if (showAddBarcode && newBarcodeGroup.name.trim() && newBarcodeGroup.size_ids.length > 0) {
      try {
        await addBarcodeGroup(showAddBarcode.categoryId, showAddBarcode.variantId, newBarcodeGroup);
        setNewBarcodeGroup({ name: '', size_ids: [], price: 0 });
        setShowAddBarcode(null);
      } catch (error) {
        console.error('Error adding barcode group:', error);
      }
    }
  };

  const toggleSize = (sizeId: string) => {
    setNewBarcodeGroup(prev => ({
      ...prev,
      size_ids: prev.size_ids.includes(sizeId)
        ? prev.size_ids.filter(id => id !== sizeId)
        : [...prev.size_ids, sizeId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-yellow">
            <Package className="w-8 h-8 text-brand-black" />
          </div>
          <p className="text-modern-600 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-modern text-center py-16">
        <div className="w-16 h-16 bg-accent-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-accent-error" />
        </div>
        <h3 className="text-xl font-bold text-brand-black mb-2">Error Loading Products</h3>
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
            Product <span className="text-gradient-yellow">Hub</span>
          </h2>
          <p className="text-modern-600 text-lg font-medium">Manage categories, variants, colors, and inventory</p>
        </div>
        <button
          onClick={() => setShowAddCategory(true)}
          className="btn-primary flex items-center space-x-3 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-200" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="card-modern w-96 animate-slide-up">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-yellow-glow">
                <Plus className="w-6 h-6 text-brand-black" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-black">Add New Category</h3>
                <p className="text-modern-600 text-sm">Create a new product category</p>
              </div>
            </div>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name (e.g., T-Shirts)"
              className="input-modern mb-6"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={handleAddCategory}
                className="btn-primary flex-1"
              >
                Create Category
              </button>
              <button
                onClick={() => setShowAddCategory(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Color Modal */}
      {showAddColor && (
        <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="card-modern w-96 animate-slide-up">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-yellow-glow">
                <Palette className="w-6 h-6 text-brand-black" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-black">Add New Color</h3>
                <p className="text-modern-600 text-sm">Define a new color variant</p>
              </div>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newColor.name}
                onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                placeholder="Color name (e.g., Navy Blue)"
                className="input-modern"
                autoFocus
              />
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <input
                    type="color"
                    value={newColor.hex}
                    onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                    className="w-16 h-12 rounded-xl border-2 border-modern-200 cursor-pointer shadow-modern hover:shadow-modern-lg transition-all duration-200"
                  />
                  <div className="absolute inset-0 rounded-xl border-2 border-brand-yellow/20 pointer-events-none"></div>
                </div>
                <input
                  type="text"
                  value={newColor.hex}
                  onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                  placeholder="#000000"
                  className="input-modern flex-1"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddColor}
                className="btn-primary flex-1"
              >
                Add Color
              </button>
              <button
                onClick={() => setShowAddColor(null)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Barcode Group Modal */}
      {showAddBarcode && (
        <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="card-modern w-[500px] animate-slide-up">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-yellow-glow">
                <BarChart3 className="w-6 h-6 text-brand-black" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-black">Create Barcode Group</h3>
                <p className="text-modern-600 text-sm">Define pricing and size combinations</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Group Name</label>
                <input
                  type="text"
                  value={newBarcodeGroup.name}
                  onChange={(e) => setNewBarcodeGroup({ ...newBarcodeGroup, name: e.target.value })}
                  placeholder="Group name (e.g., Small-Medium)"
                  className="input-modern"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-3 uppercase tracking-wider">Select Sizes</label>
                <div className="grid grid-cols-5 gap-3">
                  {sizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => toggleSize(size.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 font-semibold ${
                        newBarcodeGroup.size_ids.includes(size.id)
                          ? 'bg-brand-yellow border-brand-yellow text-brand-black shadow-yellow-glow'
                          : 'bg-modern-50 border-modern-200 text-modern-700 hover:border-brand-yellow/30 hover:bg-brand-yellow/5'
                      }`}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Price ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-modern-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={newBarcodeGroup.price}
                    onChange={(e) => setNewBarcodeGroup({ ...newBarcodeGroup, price: parseFloat(e.target.value) || 0 })}
                    className="input-modern pl-12 text-lg font-bold"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-8">
              <button
                onClick={handleAddBarcodeGroup}
                className="btn-primary flex-1"
              >
                Create Barcode
              </button>
              <button
                onClick={() => setShowAddBarcode(null)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-8">
        {categories.map(category => (
          <div key={category.id} className="card-modern relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 gradient-yellow"></div>
            <div className="p-8 border-b border-modern-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center shadow-yellow-glow group-hover:animate-pulse-yellow transition-all duration-200 hover:scale-105"
                  >
                    {expandedCategories.has(category.id) ? (
                      <ChevronDown className="w-8 h-8 text-brand-black" />
                    ) : (
                      <ChevronRight className="w-8 h-8 text-brand-black" />
                    )}
                  </button>
                  <div>
                    <h3 className="text-2xl font-bold text-brand-black">{category.name}</h3>
                    <p className="text-modern-600 font-medium">{category.variants.length} variants available</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowAddVariant(category.id)}
                    className="btn-secondary flex items-center space-x-2 group/btn"
                  >
                    <Plus size={16} className="group-hover/btn:rotate-90 transition-transform duration-200" />
                    <span>Add Variant</span>
                  </button>
                </div>
              </div>

              {/* Add Variant Input */}
              {showAddVariant === category.id && (
                <div className="mt-6 p-6 bg-modern-50 rounded-xl border border-modern-200 animate-slide-up">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newVariantName}
                      onChange={(e) => setNewVariantName(e.target.value)}
                      placeholder="Variant name (e.g., Polo)"
                      className="input-modern flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddVariant(category.id)}
                      className="btn-primary"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddVariant(null)}
                      className="btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Variants - Only show when expanded */}
            {expandedCategories.has(category.id) && (
              <div className="p-8 space-y-6 animate-slide-up">
              {category.variants.map(variant => (
                <div key={variant.id} className="border border-modern-200 rounded-2xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all duration-300">
                  <div className="p-6 bg-modern-50 border-b border-modern-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 gradient-black rounded-xl flex items-center justify-center shadow-modern">
                          <Edit3 className="w-6 h-6 text-brand-white" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-brand-black">{variant.name}</h4>
                          <p className="text-modern-600 font-medium">{variant.colors.length} color variants</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAddColor({ categoryId: category.id, variantId: variant.id })}
                        className="bg-brand-yellow/10 text-brand-yellow-dark px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-brand-yellow/20 transition-all duration-200 border border-brand-yellow/20"
                      >
                        <Palette size={16} />
                        <span className="font-medium">Add Color</span>
                      </button>
                    </div>
                  </div>

                  {/* Colors and Sizes */}
                  <div className="p-6">
                    {variant.colors.map(color => (
                      <div key={color.id} className="mb-8 last:mb-0">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-8 h-8 rounded-xl border-2 border-modern-300 shadow-modern"
                              style={{ backgroundColor: color.hex }}
                            ></div>
                            <h5 className="text-lg font-bold text-brand-black">{color.name}</h5>
                          </div>
                          <div className="h-px bg-modern-200 flex-1"></div>
                          <button
                            onClick={() => setShowSizeStock({
                              categoryId: category.id,
                              variantId: variant.id,
                              colorId: color.id
                            })}
                            className="bg-brand-black/10 text-brand-black px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-brand-black/20 transition-all duration-200 border border-brand-black/20"
                          >
                            <Layers size={14} />
                            <span className="text-sm font-medium">Manage Stock</span>
                          </button>
                        </div>

                        {/* Size Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {sizes.map(size => {
                            const stock = color.sizes[size.id] || 0;
                            const isLowStock = stock > 0 && stock < 10;
                            const isOutOfStock = stock === 0;

                            return (
                              <div key={size.id} className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                                isOutOfStock ? 'bg-accent-error/5 border-accent-error/20' :
                                isLowStock ? 'bg-accent-warning/5 border-accent-warning/20' :
                                'bg-modern-50 border-modern-200 hover:border-brand-yellow/30'
                              }`}>
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-bold text-brand-black">{size.name}</span>
                                  <Ruler className={`w-4 h-4 ${
                                    isOutOfStock ? 'text-accent-error' :
                                    isLowStock ? 'text-accent-warning' :
                                    'text-modern-400'
                                  }`} />
                                </div>
                                <input
                                  type="number"
                                  value={stock}
                                  onChange={(e) => handleStockUpdate(category.id, variant.id, color.id, size.id, e.target.value)}
                                  className={`w-full p-3 rounded-xl text-center font-bold text-lg transition-all duration-200 ${
                                    isOutOfStock ? 'border-accent-error/30 focus:border-accent-error focus:ring-accent-error/20' :
                                    isLowStock ? 'border-accent-warning/30 focus:border-accent-warning focus:ring-accent-warning/20' :
                                    'border-modern-200 focus:border-brand-yellow focus:ring-brand-yellow/20'
                                  } focus:ring-2`}
                                  min="0"
                                />
                                <p className={`text-xs font-medium mt-2 text-center ${
                                  isOutOfStock ? 'text-accent-error' :
                                  isLowStock ? 'text-accent-warning' :
                                  'text-modern-500'
                                }`}>
                                  {isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'units'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {variant.colors.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-modern-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Palette className="w-8 h-8 text-modern-400" />
                        </div>
                        <p className="text-modern-600 font-medium">No colors added yet</p>
                        <p className="text-modern-500 text-sm">Click "Add Color" to get started</p>
                      </div>
                    )}

                    {/* Barcode Groups Section */}
                    {/* {variant.colors.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-modern-200">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <BarChart3 className="w-6 h-6 text-brand-black" />
                            <h5 className="text-lg font-bold text-brand-black">Barcode Groups & Pricing</h5>
                          </div>
                          <button
                            onClick={() => setShowAddBarcode({ categoryId: category.id, variantId: variant.id })}
                            className="bg-brand-yellow/10 text-brand-yellow-dark px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-brand-yellow/20 transition-all duration-200 border border-brand-yellow/20"
                          >
                            <Plus size={16} />
                            <span className="font-medium">Add Barcode</span>
                          </button>
                        </div>

                        {variant.barcodeGroups.length === 0 ? (
                          <div className="text-center py-8 bg-modern-50 rounded-xl border border-modern-200">
                            <div className="w-12 h-12 bg-modern-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                              <BarChart3 className="w-6 h-6 text-modern-400" />
                            </div>
                            <p className="text-modern-600 font-medium">No barcode groups created</p>
                            <p className="text-modern-500 text-sm">Create barcode groups to set pricing for size combinations</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {variant.barcodeGroups.map(group => (
                              <div key={group.id} className="bg-brand-white border-2 border-modern-200 rounded-xl p-4 hover:border-brand-yellow/30 hover:shadow-modern transition-all duration-200">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h6 className="font-bold text-brand-black">{group.name}</h6>
                                    <p className="text-modern-600 text-sm">
                                      Sizes: {group.size_ids.map(id => sizes.find(s => s.id === id)?.name).join(', ')}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center justify-end space-x-1 text-brand-yellow-dark">
                                      <DollarSign size={16} />
                                      <span className="text-lg font-bold">${group.price.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-modern-50 border border-modern-200 rounded-lg p-3">
                                  <div className="flex items-center justify-center space-x-px mb-2">
                                    {group.barcode.split('').map((digit, index) => (
                                      <div key={index} className="w-1 bg-brand-black" style={{ height: `${12 + (parseInt(digit) * 1)}px` }}></div>
                                    ))}
                                  </div>
                                  <p className="text-center text-xs font-mono font-bold text-brand-black">{group.barcode}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )} */}
                  </div>
                </div>
              ))}

              {category.variants.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-modern-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Edit3 className="w-8 h-8 text-modern-400" />
                  </div>
                  <p className="text-modern-600 font-medium">No variants added yet</p>
                  <p className="text-modern-500 text-sm">Click "Add Variant" to get started</p>
                </div>
              )}
              </div>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="card-modern text-center py-16">
            <div className="w-24 h-24 gradient-yellow rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-yellow-glow animate-pulse-yellow">
              <Package className="w-12 h-12 text-brand-black" />
            </div>
            <h3 className="text-2xl font-bold text-brand-black mb-3">No Products Yet</h3>
            <p className="text-modern-600 text-lg mb-8 max-w-md mx-auto">
              Start building your inventory by creating your first product category
            </p>
            <button
              onClick={() => setShowAddCategory(true)}
              className="btn-primary text-lg px-8 py-4"
            >
              Create First Category
            </button>
          </div>
        )}
      </div>

      {/* Size Stock Management Modal */}
      {showSizeStock && (
        <div className="fixed inset-0 bg-brand-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-brand-white rounded-3xl shadow-modern-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-modern-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-brand-black">Individual Size Stock Management</h2>
                <button
                  onClick={() => setShowSizeStock(null)}
                  className="p-2 hover:bg-modern-100 rounded-lg transition-colors duration-200"
                >
                  <X size={24} className="text-modern-600" />
                </button>
              </div>
            </div>
            <div className="p-8">
              <SizeStockManagement
                selectedCategory={showSizeStock.categoryId}
                selectedVariant={showSizeStock.variantId}
                selectedColor={showSizeStock.colorId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductManagement;