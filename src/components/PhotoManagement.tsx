import React, { useState } from 'react';
import { Camera, Upload, Image, Trash2, Star, Plus } from 'lucide-react';
import { useSupabaseInventory } from '../context/SupabaseInventoryContext';

function PhotoManagement() {
  const { categories, sizes, loading, error } = useSupabaseInventory();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<{ [key: string]: string[] }>({});

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || !selectedVariant || !selectedColor) return;

    setUploadingPhotos(true);
    try {
      // In a real implementation, you would upload to Supabase Storage
      // For demo purposes, we'll use placeholder URLs
      const newPhotos = Array.from(files).map((file, index) => 
        `https://images.unsplash.com/photo-${1500000000000 + Date.now() + index}?w=400&h=400&fit=crop&crop=center`
      );

      const photoKey = `${selectedVariant}-${selectedColor}`;
      setPhotos(prev => ({
        ...prev,
        [photoKey]: [...(prev[photoKey] || []), ...newPhotos]
      }));

    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (photoKey: string, photoIndex: number) => {
    setPhotos(prev => ({
      ...prev,
      [photoKey]: prev[photoKey]?.filter((_, index) => index !== photoIndex) || []
    }));
  };

  const setPrimaryPhoto = (photoKey: string, photoIndex: number) => {
    setPhotos(prev => {
      const currentPhotos = prev[photoKey] || [];
      const primaryPhoto = currentPhotos[photoIndex];
      const otherPhotos = currentPhotos.filter((_, index) => index !== photoIndex);
      
      return {
        ...prev,
        [photoKey]: [primaryPhoto, ...otherPhotos]
      };
    });
  };

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);
  const selectedVariantData = selectedCategoryData?.variants.find(v => v.id === selectedVariant);
  const selectedColorData = selectedVariantData?.colors.find(c => c.id === selectedColor);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-yellow">
            <Camera className="w-8 h-8 text-brand-black" />
          </div>
          <p className="text-modern-600 font-medium">Loading photo management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-modern text-center py-16">
        <div className="w-16 h-16 bg-accent-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-accent-error" />
        </div>
        <h3 className="text-xl font-bold text-brand-black mb-2">Error Loading Photos</h3>
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
          Photo <span className="text-gradient-yellow">Studio</span>
        </h2>
        <p className="text-modern-600 text-lg font-medium">Manage product photography and visual assets</p>
      </div>

      {/* Product Selection */}
      <div className="card-modern">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-yellow-glow">
            <Camera className="w-6 h-6 text-brand-black" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-black">Select Product</h3>
            <p className="text-modern-600 text-sm">Choose a product variant and color to manage photos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedVariant('');
                setSelectedColor('');
              }}
              className="input-modern"
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          {selectedCategoryData && (
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Variant</label>
              <select
                value={selectedVariant}
                onChange={(e) => {
                  setSelectedVariant(e.target.value);
                  setSelectedColor('');
                }}
                className="input-modern"
              >
                <option value="">Select Variant</option>
                {selectedCategoryData.variants.map(variant => (
                  <option key={variant.id} value={variant.id}>{variant.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedVariantData && (
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">Color</label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="input-modern"
              >
                <option value="">Select Color</option>
                {selectedVariantData.colors.map(color => (
                  <option key={color.id} value={color.id}>{color.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Photo Upload and Management */}
      {selectedColor && selectedColorData && (
        <div className="card-modern">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 gradient-black rounded-xl flex items-center justify-center shadow-modern">
                <Image className="w-6 h-6 text-brand-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-black">
                  {selectedVariantData?.name} - {selectedColorData.name}
                </h3>
                <p className="text-modern-600 text-sm">Upload and manage product photos</p>
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-xl border-2 border-modern-300 shadow-modern"
              style={{ backgroundColor: selectedColorData.hex }}
            ></div>
          </div>

          {/* Upload Area */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-brand-black mb-3 uppercase tracking-wider">Upload Photos</label>
            <div className="border-2 border-dashed border-modern-300 rounded-2xl p-8 text-center hover:border-brand-yellow/50 hover:bg-brand-yellow/5 transition-all duration-200 cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e.target.files)}
                className="hidden"
                id="photo-upload"
                disabled={uploadingPhotos}
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-yellow-glow group-hover:animate-pulse-yellow">
                  {uploadingPhotos ? (
                    <div className="w-8 h-8 border-2 border-brand-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-8 h-8 text-brand-black" />
                  )}
                </div>
                <p className="text-lg font-bold text-brand-black mb-2">
                  {uploadingPhotos ? 'Uploading...' : 'Drop photos here or click to browse'}
                </p>
                <p className="text-modern-600">Support for JPG, PNG, WebP up to 10MB each</p>
              </label>
            </div>
          </div>

          {/* Photo Gallery */}
          <div>
            <label className="block text-sm font-bold text-brand-black mb-3 uppercase tracking-wider">Photo Gallery</label>
            {(() => {
              const photoKey = `${selectedVariant}-${selectedColor}`;
              const currentPhotos = photos[photoKey] || [];
              
              if (currentPhotos.length === 0) {
                return (
                  <div className="text-center py-12 bg-modern-50 rounded-2xl border border-modern-200">
                    <div className="w-16 h-16 bg-modern-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Image className="w-8 h-8 text-modern-400" />
                    </div>
                    <p className="text-modern-600 font-medium">No photos uploaded yet</p>
                    <p className="text-modern-500 text-sm">Upload photos to see them here</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {currentPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-modern-100 rounded-2xl overflow-hidden border-2 border-modern-200 hover:border-brand-yellow/30 transition-all duration-200">
                        <img
                          src={photo}
                          alt={`Product photo ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      
                      {/* Photo Controls */}
                      <div className="absolute inset-0 bg-brand-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setPrimaryPhoto(photoKey, index)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            index === 0 
                              ? 'bg-brand-yellow text-brand-black' 
                              : 'bg-brand-white/20 text-brand-white hover:bg-brand-yellow hover:text-brand-black'
                          }`}
                          title={index === 0 ? 'Primary photo' : 'Set as primary'}
                        >
                          <Star size={16} className={index === 0 ? 'fill-current' : ''} />
                        </button>
                        <button
                          onClick={() => removePhoto(photoKey, index)}
                          className="p-2 bg-accent-error/80 text-brand-white rounded-lg hover:bg-accent-error transition-all duration-200"
                          title="Delete photo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Primary Badge */}
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-brand-yellow text-brand-black px-2 py-1 rounded-lg text-xs font-bold shadow-yellow-glow">
                          PRIMARY
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedColor && (
        <div className="card-modern text-center py-16">
          <div className="w-24 h-24 gradient-yellow rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-yellow-glow animate-pulse-yellow">
            <Camera className="w-12 h-12 text-brand-black" />
          </div>
          <h3 className="text-2xl font-bold text-brand-black mb-3">Ready for Your Photoshoot</h3>
          <p className="text-modern-600 text-lg mb-8 max-w-md mx-auto">
            Select a product variant and color to start uploading and managing photos
          </p>
        </div>
      )}
    </div>
  );
}

export default PhotoManagement;
