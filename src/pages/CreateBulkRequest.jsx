import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, ShoppingCart, X } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { Button, Input } from '../components/UI'

const PRODUCT_TYPES = ['rice', 'maize', 'wheat', 'sorghum', 'millet', 'other']
const QUALITY_GRADES = ['Grade A', 'Grade B', 'Grade C', 'Premium', 'Standard']

export default function CreateBulkRequest() {
  const navigate = useNavigate()
  const toast = useToast()

  const [formData, setFormData] = useState({
    product_type: '',
    required_quantity: '',
    quality_grade: 'Grade A',
    delivery_location: '',
    delivery_date: '',
    max_price_per_unit: '',
    fulfillment_mode: 'seller_supply_group',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  function validate() {
    const newErrors = {}
    if (!formData.product_type) newErrors.product_type = 'Product type is required'
    if (!formData.required_quantity || parseFloat(formData.required_quantity) <= 0) newErrors.required_quantity = 'Valid quantity is required'
    if (!formData.delivery_location) newErrors.delivery_location = 'Delivery location is required'
    if (!formData.delivery_date) newErrors.delivery_date = 'Delivery date is required'
    else if (new Date(formData.delivery_date) <= new Date()) newErrors.delivery_date = 'Delivery date must be in the future'
    return newErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const res = await api.createBulkRequest({
        product_type: formData.product_type,
        required_quantity: parseFloat(formData.required_quantity),
        quality_grade: formData.quality_grade,
        delivery_location: formData.delivery_location,
        delivery_date: formData.delivery_date,
        max_price_per_unit: formData.max_price_per_unit ? parseFloat(formData.max_price_per_unit) : null,
        fulfillment_mode: formData.fulfillment_mode,
        notes: formData.notes,
      })

      if (res.success) {
        toast.success('Bulk procurement request created successfully')
        navigate(`/bulk-procurement/${res.request.id}`)
      } else {
        toast.error(res.message || 'Failed to create request')
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateString = minDate.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/bulk-procurement" className="text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            Create Bulk Procurement Request
          </h1>
          <p className="text-gray-600 mb-8">
            Create a request for large-quantity procurement. Sellers will join to supply the required quantity.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fulfillment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fulfillment Method</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fulfillment_mode"
                    value="seller_supply_group"
                    checked={formData.fulfillment_mode === 'seller_supply_group'}
                    onChange={handleChange}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Seller Supply Group (multiple sellers)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fulfillment_mode"
                    value="buyer_group_buying"
                    checked={formData.fulfillment_mode === 'buyer_group_buying'}
                    onChange={handleChange}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Buyer Group Buying (collective demand)</span>
                </label>
              </div>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Type *</label>
              <select
                name="product_type"
                value={formData.product_type}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
                  errors.product_type ? 'border-red-300' : ''
                }`}
                required
              >
                <option value="">Select product type</option>
                {PRODUCT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.product_type && <p className="mt-1 text-xs text-red-600">{errors.product_type}</p>}
            </div>

            {/* Required Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Quantity (tonnes) *</label>
              <Input
                name="required_quantity"
                type="number"
                placeholder="e.g., 100"
                value={formData.required_quantity}
                onChange={handleChange}
                error={errors.required_quantity}
                min="1"
                step="0.01"
              />
            </div>

            {/* Quality Grade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quality Grade</label>
              <select
                name="quality_grade"
                value={formData.quality_grade}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              >
                {QUALITY_GRADES.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            {/* Delivery Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location *</label>
              <Input
                name="delivery_location"
                placeholder="e.g., Dar es Salaam"
                value={formData.delivery_location}
                onChange={handleChange}
                error={errors.delivery_location}
              />
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date *</label>
              <Input
                name="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={handleChange}
                error={errors.delivery_date}
                min={minDateString}
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price per Tonne (TZS)
              </label>
              <Input
                name="max_price_per_unit"
                type="number"
                placeholder="Leave empty for no limit"
                value={formData.max_price_per_unit}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
              <p className="mt-1 text-xs text-gray-500">Maximum price you are willing to pay per tonne</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional requirements or notes..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
                size="lg"
              >
                {loading ? 'Creating...' : 'Create Procurement Request'}
              </Button>
              <Link to="/bulk-procurement">
                <Button variant="outline" size="lg">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
