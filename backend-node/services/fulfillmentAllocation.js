'use strict'

/**
 * Multi-Seller Fulfillment Allocation Engine
 *
 * Splits a single buyer order across multiple sellers/warehouses based on
 * available inventory. Produces a list of fulfillment allocations that
 * the caller can persist as order_fulfillments rows.
 *
 * Example: Buyer needs 100 tonnes of maize
 *   Seller A → 40 tonnes
 *   Seller B → 35 tonnes
 *   Seller C → 25 tonnes
 *   ---------------------
 *   Total     → 100 tonnes
 */

/**
 * Allocate a requested quantity across available inventory sources.
 *
 * @param {object} params
 * @param {string} params.productType  - Product type/grade filter (e.g. 'maize', 'rice')
 * @param {number} params.requestedQty - Total quantity the buyer needs
 * @param {Array}  params.sources      - Available inventory sources
 *   Each source: { product_id, seller_id, warehouse_id, stock_quantity, price, unit }
 * @param {object} [options]
 *   @param {string} [options.sortBy] - 'price_asc' | 'price_desc' | 'stock_asc' | 'distance'
 *   @param {number}  [options.maxSources] - Cap on number of sellers to use
 *   @param {boolean} [options.allowPartial] - If false, throws when total < requestedQty
 *
 * @returns {object}
 *   @returns {Array}  .allocations - [{ product_id, seller_id, warehouse_id, quantity, unit_price, total_price }]
 *   @returns {number} .totalAllocated
 *   @returns {number} .shortfall
 *   @returns {boolean}.complete
 */
function allocateFulfillment({ productType, requestedQty, sources, options = {} }) {
  if (!requestedQty || requestedQty <= 0) {
    throw new Error('requestedQty must be a positive number')
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('At least one inventory source is required')
  }

  const {
    sortBy = 'price_asc',
    maxSources = null,
    allowPartial = true,
  } = options

  // Filter to sources that have stock
  const available = sources
    .filter(s => s && parseFloat(s.stock_quantity) > 0)
    .map(s => ({
      product_id: s.product_id,
      seller_id: s.seller_id,
      warehouse_id: s.warehouse_id || null,
      stock_quantity: parseFloat(s.stock_quantity),
      unit_price: parseFloat(s.price) || 0,
      unit: s.unit || 'kg',
    }))

  if (available.length === 0) {
    return {
      productType: productType || null,
      requestedQty,
      allocations: [],
      totalAllocated: 0,
      shortfall: requestedQty,
      complete: false,
    }
  }

  // Sort by configured strategy
  const sortFns = {
    price_asc: (a, b) => a.unit_price - b.unit_price,
    price_desc: (a, b) => b.unit_price - a.unit_price,
    stock_asc: (a, b) => a.stock_quantity - b.stock_quantity,
    stock_desc: (a, b) => b.stock_quantity - a.stock_quantity,
  }
  const sortFn = sortFns[sortBy] || sortFns.price_asc
  available.sort(sortFn)

  // Apply maxSources cap
  const candidates = maxSources ? available.slice(0, maxSources) : available

  // Greedy allocation: take from cheapest (or best-scoring) sources first
  const allocations = []
  let remaining = requestedQty

  for (const src of candidates) {
    if (remaining <= 0) break
    const take = Math.min(remaining, src.stock_quantity)
    if (take <= 0) continue

    allocations.push({
      product_id: src.product_id,
      seller_id: src.seller_id,
      warehouse_id: src.warehouse_id,
      quantity: take,
      unit_price: src.unit_price,
      total_price: parseFloat((take * src.unit_price).toFixed(2)),
      unit: src.unit,
    })

    remaining -= take
  }

  const totalAllocated = requestedQty - remaining
  const complete = remaining <= 0

  if (!complete && !allowPartial) {
    throw new Error(
      `Insufficient inventory for ${productType || 'requested product'}: ` +
      `need ${requestedQty}, only ${totalAllocated} available across ${allocations.length} sellers`
    )
  }

  return {
    productType: productType || null,
    requestedQty,
    allocations,
    totalAllocated,
    shortfall: remaining,
    complete,
  }
}

/**
 * Group allocations by seller for display/commission purposes.
 *
 * @param {Array} allocations
 * @returns {Array} [{ seller_id, quantity, total_price, items: [...] }]
 */
function groupBySeller(allocations) {
  const groups = new Map()
  for (const a of allocations) {
    const key = String(a.seller_id)
    if (!groups.has(key)) {
      groups.set(key, { seller_id: a.seller_id, quantity: 0, total_price: 0, items: [] })
    }
    const g = groups.get(key)
    g.quantity += a.quantity
    g.total_price += a.total_price
    g.items.push(a)
  }
  return Array.from(groups.values())
}

module.exports = {
  allocateFulfillment,
  groupBySeller,
}