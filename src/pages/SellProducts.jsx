import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Package, Upload, Image, Video, Tag, Warehouse, MapPin, Truck, Star, Shield, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

export default function SellProducts() {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [formData, setFormData] = useState({
    name: '', category: 'Rice', price: '', quantity: '', description: '', region: 'Dar es Salaam', warehouse: '', deliveryTime: '1-2 days', qualityGrade: 'A', moistureLevel: '12%'
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sell Products</h1>
        <p className="text-gray-500 mt-1">List your agricultural products for sale</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
         <form onSubmit={async (e) => {
           e.preventDefault()
           if (!formData.name || !formData.price || !formData.quantity) {
             toast.error('Please fill in all required fields')
             return
           }
           setSubmitting(true)
            try {
              const res = await api.createProductWithImages({
                name: formData.name,
                category: formData.category,
                price_per_kg: Number(formData.price),
                quantity: formData.quantity,
                description: formData.description,
                region: formData.region,
                warehouse: formData.warehouse,
                delivery_time: formData.deliveryTime,
                quality_grade: formData.qualityGrade,
                moisture_level: formData.moistureLevel,
              }, images)
             if (res?.success) {
               toast.success('Product listed successfully!')
               setFormData({ name: '', category: 'Rice', price: '', quantity: '', description: '', region: 'Dar es Salaam', warehouse: '', deliveryTime: '1-2 days', qualityGrade: 'A', moistureLevel: '12%' })
             } else {
               toast.error(res?.message || 'Failed to list product')
             }
           } catch {
             toast.error('Failed to list product')
           } finally {
             setSubmitting(false)
           }
         }} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="e.g. Premium Pishori Rice" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="input-field">
                <option>Rice</option><option>Maize</option><option>Wheat</option><option>Sorghum</option><option>Beans</option><option>Groundnuts</option><option>Sesame</option><option>Millet</option><option>Sunflower</option><option>Fertilizer</option><option>Seeds</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (TZS/kg)</label>
              <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="input-field" placeholder="2500" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity Available</label>
            <input type="text" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="input-field" placeholder="e.g. 1000 kg" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="input-field" rows={4} placeholder="Describe your product quality, origin, etc." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Region</label>
              <select value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} className="input-field">
                {['Dar es Salaam', 'Mbeya', 'Morogoro', 'Iringa', 'Songea', 'Dodoma', 'Arusha', 'Mwanza', 'Tanga', 'Kilimanjaro'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Warehouse</label>
              <input type="text" value={formData.warehouse} onChange={(e) => setFormData({...formData, warehouse: e.target.value})} className="input-field" placeholder="Warehouse location" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Time</label>
              <select value={formData.deliveryTime} onChange={(e) => setFormData({...formData, deliveryTime: e.target.value})} className="input-field">
                <option>1-2 days</option><option>3-5 days</option><option>1 week</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quality Grade</label>
              <select value={formData.qualityGrade} onChange={(e) => setFormData({...formData, qualityGrade: e.target.value})} className="input-field">
                <option>A</option><option>B</option><option>C</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Moisture Level</label>
              <input type="text" value={formData.moistureLevel} onChange={(e) => setFormData({...formData, moistureLevel: e.target.value})} className="input-field" placeholder="12%" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Images</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Drag and drop images here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB each</p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  const valid = files.filter(f => f.size <= 5 * 1024 * 1024)
                  if (valid.length !== files.length) {
                    toast.error('Some files exceed the 5MB limit and were skipped')
                  }
                  setImages(valid)
                  setImagePreviews(valid.map(f => URL.createObjectURL(f)))
                }}
              />
            </label>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative">
                    <img src={preview} alt={`preview ${idx}`} className="w-full h-20 object-cover rounded-lg border" />
                  </div>
                ))}
              </div>
            )}
            {images.length === 0 && (
              <p className="text-xs text-red-500 mt-2">At least one product image is recommended</p>
            )}
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Listing...' : 'List Product'}
            </button>
            <button type="button" className="btn-secondary">Save as Draft</button>
          </div>
        </form>
      </div>
    </div>
  )
}
