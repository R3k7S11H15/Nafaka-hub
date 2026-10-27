import React, { useState, useRef } from 'react'
import { Download, Upload, FileText, Users, Package, ShoppingCart, DollarSign, AlertCircle, CheckCircle, XCircle, Table, Trash2, File, Eye, RefreshCw } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'

const IMPORT_TEMPLATES = {
  users: { headers: ['full_name', 'email', 'phone', 'role', 'business_name'], required: ['full_name', 'email'] },
  products: { headers: ['name', 'description', 'price', 'quantity', 'unit', 'category'], required: ['name', 'price'] },
  orders: { headers: ['customer_email', 'total_amount', 'payment_method', 'shipping_address'], required: ['customer_email', 'total_amount'] },
}

export default function SuperAdminExport() {
  const toast = useToast()
  const [exportLoading, setExportLoading] = useState(false)
  const [importType, setImportType] = useState('users')
  const [file, setFile] = useState(null)
  const [importData, setImportData] = useState([])
  const [headers, setHeaders] = useState([])
  const [preview, setPreview] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [processing, setProcessing] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length > 0) {
        const cols = parseCSVLine(lines[0])
        setHeaders(cols)
        const data = lines.slice(1).map(line => {
          const values = parseCSVLine(line)
          const row = {}
          cols.forEach((col, i) => { row[col] = values[i] || '' })
          return row
        })
        setImportData(data)
        validateData(data)
      }
    }
    reader.readAsText(uploadedFile)
  }

  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const validateData = (data) => {
    const template = IMPORT_TEMPLATES[importType]
    const errors = []
    const requiredSet = new Set(template.required)

    const headerSet = new Set(headers)
    const missing = template.required.filter(h => !headerSet.has(h))
    if (missing.length > 0) {
      errors.push({ row: 0, field: 'headers', message: `Missing required columns: ${missing.join(', ')}` })
    }

    data.forEach((row, idx) => {
      template.required.forEach(field => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push({ row: idx + 2, field, message: `${field} is required` })
        }
      })

      if (importType === 'users' && row.email && !row.email.includes('@')) {
        errors.push({ row: idx + 2, field: 'email', message: 'Invalid email format' })
      }
      if (importType === 'products' && row.price && isNaN(parseFloat(row.price))) {
        errors.push({ row: idx + 2, field: 'price', message: 'Price must be a number' })
      }
      if (importType === 'orders' && row.total_amount && isNaN(parseFloat(row.total_amount))) {
        errors.push({ row: idx + 2, field: 'total_amount', message: 'Total amount must be a number' })
      }
    })

    setValidationErrors(errors)
    setPreview(data.slice(0, 10))
  }

  const handleImportConfirm = async () => {
    if (validationErrors.filter(e => e.row !== 0).length > 0) {
      toast.error('Please fix validation errors before importing')
      return
    }

    setProcessing(true)
    try {
      const flatData = importData.map(row => Object.values(row))
      const res = await api.confirmImport(importType, flatData)
      setImportResult({ success: true, message: `Successfully imported ${importData.length} ${importType}`, count: importData.length })
      setTimeout(() => {
        handleReset()
      }, 3000)
    } catch (err) {
      console.error(err)
      setImportResult({ success: false, message: 'Import failed. Please try again.' })
    } finally {
      setProcessing(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setImportData([])
    setHeaders([])
    setPreview(null)
    setValidationErrors([])
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadTemplate = () => {
    const template = IMPORT_TEMPLATES[importType]
    const csv = template.headers.join(',')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${importType}-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = async (type) => {
    setExportLoading(true)
    try {
      let res
      let filename
      if (type === 'users') { res = await api.exportUsers(); filename = 'users.csv' }
      else if (type === 'orders') { res = await api.exportOrders(); filename = 'orders.csv' }
      else if (type === 'products') { res = await api.exportProducts(); filename = 'products.csv' }
      else if (type === 'financial') { res = await api.exportFinancial(); filename = 'financial-report.csv' }
      else if (type === 'audit') { res = await api.exportAuditLogs(); filename = 'audit-log.csv' }

      const blob = new Blob([res], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setExportLoading(false)
    }
  }

  const groupedErrors = validationErrors.reduce((acc, err) => {
    const key = err.row === 0 ? 'header' : `row-${err.row}`
    if (!acc[key]) acc[key] = []
    acc[key].push(err)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export / Import</h1>
        <p className="text-gray-500 text-sm mt-1">Export data to CSV or import records with validation</p>
      </div>

      {importResult && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {importResult.success ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <p className={`text-sm font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>{importResult.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-gray-600" /> Export Data
          </h3>
          <div className="space-y-3">
            {[
              { type: 'users', icon: Users, label: 'Export Users', desc: 'All user accounts' },
              { type: 'orders', icon: ShoppingCart, label: 'Export Orders', desc: 'All orders' },
              { type: 'products', icon: Package, label: 'Export Products', desc: 'All products' },
              { type: 'financial', icon: DollarSign, label: 'Export Financial', desc: 'Revenue, commissions, withdrawals' },
              { type: 'audit', icon: FileText, label: 'Export Audit Logs', desc: 'All audit trail' },
            ].map(({ type, icon: Icon, label, desc }) => (
              <button
                key={type}
                onClick={() => handleExport(type)}
                disabled={exportLoading}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left disabled:opacity-50"
              >
                <Icon className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                {exportLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-gray-600" /> Import Data
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                <select
                  value={importType}
                  onChange={(e) => { setImportType(e.target.value); handleReset() }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="users">Users</option>
                  <option value="products">Products</option>
                  <option value="orders">Orders</option>
                </select>
              </div>
              <button onClick={downloadTemplate} className="mt-6 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <File className="w-4 h-4" /> Template
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV File</label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-700">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Drop CSV file here or click to upload</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {importData.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    <span className="text-green-600">{importData.length}</span> rows detected
                  </p>
                  <button onClick={handleReset} className="text-xs text-red-600 hover:text-red-700">Clear</button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {headers.map(h => (
                    <span key={h} className={`px-2 py-1 rounded text-xs ${IMPORT_TEMPLATES[importType].required.includes(h) ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                      {h} {IMPORT_TEMPLATES[importType].required.includes(h) && '*'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium text-red-800">{validationErrors.length} validation errors</p>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {Object.entries(groupedErrors).map(([key, errors]) => (
                    <div key={key} className="text-xs">
                      <span className="font-medium text-red-600">{key === 'header' ? 'Headers' : `Row ${key.replace('row-', '')}`}:</span>
                      {errors.map((e, i) => (
                        <span key={i} className="text-red-700 ml-1">{e.message}{i < errors.length - 1 ? ',' : ''}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview && validationErrors.length === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800">All data validated successfully. Ready to import {importData.length} records.</p>
              </div>
            )}

            {preview && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Preview (first 10 rows)</p>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.map(h => (
                          <th key={h} className="px-2 py-1 text-left text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          {headers.map(h => (
                            <td key={h} className="px-2 py-1 text-gray-700 truncate max-w-[100px]">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview && validationErrors.filter(e => e.row !== 0).length === 0 && (
              <button
                onClick={handleImportConfirm}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import {importData.length} {importType}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
