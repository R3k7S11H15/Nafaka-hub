import React, { useState, useEffect, useRef } from 'react'
import { Loader2, Star, StarHalf, ShoppingCart, Heart, AlertCircle, Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

const btnVariants = {
  primary: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 active:scale-[0.98] shadow-sm hover:shadow-md',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-gray-400 active:scale-[0.98]',
  accent: 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 focus-visible:ring-yellow-400 active:scale-[0.98] shadow-sm hover:shadow-md',
  outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400 active:scale-[0.98]',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400 active:scale-[0.98]',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 active:scale-[0.98] shadow-sm hover:shadow-md',
}

const btnSizes = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  children,
  className = '',
  ...props
}) {
  const disabled = props.disabled || loading
  const classes = [
    btnBase,
    btnVariants[variant],
    btnSizes[size],
    fullWidth ? 'w-full' : '',
    className,
  ].join(' ')

  return (
    <Tag className={classes} disabled={disabled} {...props}>
      {loading ? (
        <Loader2 className={`animate-spin ${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      ) : null}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      )}
    </Tag>
  )
}

export function Input({
  label,
  name,
  error,
  helperText,
  icon: Icon,
  suffix,
  containerClassName = '',
  inputClassName = '',
  ...props
}) {
  const inputClasses = [
    'w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20',
    Icon ? 'pl-10' : '',
    suffix ? 'pr-10' : '',
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : '',
    inputClassName,
  ].join(' ')

  return (
    <div className={containerClassName}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
        )}
        <input
          name={name}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={helperText ? `${name}-helper` : error ? `${name}-error` : undefined}
          {...props}
        />
        {suffix && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${name}-helper`} className="mt-1 text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
}

const badgeVariants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-800',
  verified: 'bg-green-100 text-green-700',
  premium: 'bg-yellow-100 text-yellow-700',
  export: 'bg-blue-100 text-blue-700',
  green: 'bg-green-50 text-green-700 border border-green-200',
}

const badgeSizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export function Badge({ variant = 'default', size = 'md', icon: Icon, children, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-medium',
        badgeVariants[variant],
        badgeSizes[size],
        className,
      ].join(' ')}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}

export function RatingStars({ rating = 0, reviewCount, size = 'sm', interactive = false, onRate }) {
  const safeRating = Math.min(5, Math.max(0, rating))
  const full = Math.floor(safeRating)
  const hasHalf = safeRating - full >= 0.25 && safeRating - full < 0.75 ? 1 : 0
  const empty = 5 - full - hasHalf
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'

  const renderStar = (filled, half = false, idx) => (
    <button
      key={idx}
      type="button"
      disabled={!interactive}
      onClick={() => interactive && onRate && onRate(idx + 1)}
      className={`${interactive ? 'cursor-pointer' : 'cursor-default'} ${textSize} text-gray-400 transition-colors ${
        interactive ? 'hover:text-yellow-400' : ''
      }`}
      aria-label={`${idx + 1} star`}
    >
      {half ? (
        <StarHalf className={`${starSize} text-yellow-400`} />
      ) : filled ? (
        <Star className={`${starSize} text-yellow-400 fill-yellow-400`} />
      ) : (
        <Star className={`${starSize} text-gray-200`} />
      )}
    </button>
  )

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array(full).fill(0).map((_, i) => renderStar(true, false, i))}
        {hasHalf === 1 && renderStar(false, true, full)}
        {Array(empty).fill(0).map((_, i) => renderStar(false, false, full + hasHalf + i))}
      </div>
      {reviewCount !== undefined && (
        <span className={`${textSize} text-gray-500`}>({reviewCount})</span>
      )}
    </div>
  )
}

export function Card({
  children,
  className = '',
  hover = false,
  border = true,
  padding = 'md',
  onClick,
  ...props
}) {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  const classes = [
    'bg-white rounded-xl shadow-card border border-gray-100 transition-all duration-300',
    border ? '' : 'border-0 shadow-none',
    hover ? 'hover:shadow-card-hover hover:-translate-y-0.5' : '',
    paddings[padding],
    onClick ? 'cursor-pointer' : '',
    className,
  ].join(' ')

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-4 pb-4 border-b border-gray-100 last:mb-0 last:pb-0 last:border-0 ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return <div className={className}>{children}</div>
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 first:mt-0 first:pt-0 first:border-0 ${className}`}>
      {children}
    </div>
  )
}

export function LazyImage({
  src,
  alt,
  className = '',
  aspect = '16:9',
  placeholderText,
  ...props
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const aspectClasses = {
    '16:9': 'aspect-video',
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '3:2': 'aspect-[3/2]',
    auto: '',
  }

  if (!src || error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 rounded-lg ${aspectClasses[aspect]} ${className}`}
      >
        {error && <AlertCircle className="w-5 h-5 mb-1" />}
        {!src && <span className="text-xs">{placeholderText || 'No Image'}</span>}
        {error && <span className="text-xs">{placeholderText || 'Image unavailable'}</span>}
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-gray-100 rounded-lg ${aspectClasses[aspect]} ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        {...props}
      />
    </div>
  )
}

export function Price({ amount, currency = 'TZS', weight, className = '', saleAmount, sale = false }) {
  if (!amount) {
    return <span className={`text-gray-500 ${className}`}>TZS 0</span>
  }
  const formatted = Math.round(amount).toLocaleString()
  return (
    <span className={`font-bold ${className}`}>
      {sale && saleAmount ? (
        <>
          <span className="text-red-600">TZS {Math.round(saleAmount).toLocaleString()}</span>
          <span className="ml-2 text-sm text-gray-400 line-through">TZS {formatted}</span>
        </>
      ) : (
        <>TZS {formatted}</>
      )}
      {weight && <span className="text-sm font-normal text-gray-500">/{weight}</span>}
    </span>
  )
}

const FALLBACK_PRODUCT_IMG =
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'

export function ProductCard({
  product,
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false,
  className = '',
}) {
  const imageUrl =
    product.image_url
      ? product.image_url.startsWith('http')
        ? product.image_url
        : product.image_url.startsWith('/')
          ? product.image_url
          : `/images/${product.image_url}`
      : FALLBACK_PRODUCT_IMG
  const rating = product.average_rating ? parseFloat(product.average_rating) : 0
  const inStock = (product.stock_quantity || 0) > 0
  const discountPercent =
    product.discount_price && product.price > 0
      ? Math.round(((product.price - product.discount_price) / product.price) * 100)
      : 0

  return (
    <Card
      hover
      border
      className={`group overflow-hidden ${className}`}
      onClick={() => {}}
    >
      <NavLink to={`/products/${product.id}`} className="block">
        <div className="relative">
          <LazyImage
            src={imageUrl}
            alt={product.name}
            aspect="1:1"
            className="bg-gray-100"
          />
          {discountPercent > 0 && (
            <Badge variant="danger" size="sm" className="absolute top-3 left-3">
              -{discountPercent}% OFF
            </Badge>
          )}
          {onToggleWishlist && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleWishlist(product.id)
              }}
              className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-sm shadow-sm transition-all ${
                isInWishlist
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
              }`}
              aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-red-500' : ''}`} />
            </button>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Badge variant="danger" size="lg">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <Badge variant="green" size="sm">
              {product.type || 'General'}
            </Badge>
            <RatingStars rating={rating} size="sm" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate-2">
            {product.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 truncate-2">
            {product.description || 'Premium agricultural product'}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <Price
              amount={product.discount_price && product.discount_price > 0 ? product.discount_price : product.price}
              weight={product.weight}
              sale={product.discount_price && product.discount_price > 0}
              saleAmount={product.discount_price && product.discount_price > 0 ? product.discount_price : 0}
            />
          </div>
        </div>
      </NavLink>
      {onAddToCart && (
        <div className="px-5 pb-5">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            icon={ShoppingCart}
            loading={product._adding}
            disabled={!inStock || product._adding}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddToCart(product.id)
            }}
          >
            Add to Cart
          </Button>
        </div>
      )}
    </Card>
  )
}

export function StatusIndicator({ status, variant = 'dot', className = '' }) {
  const statusMap = {
    delivered: 'success',
    completed: 'success',
    paid: 'success',
    shipped: 'info',
    'in transit': 'info',
    'in_transit': 'info',
    processing: 'warning',
    pending: 'neutral',
    draft: 'neutral',
    cancelled: 'danger',
    canceled: 'danger',
    refunded: 'danger',
    failed: 'danger',
    suspended: 'danger',
  }
  const resolvedKey = statusMap[status?.toLowerCase()] || 'neutral'
  const configs = {
    success: { color: 'bg-green-500', bg: 'bg-green-100', text: 'text-green-700', label: status },
    info: { color: 'bg-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', label: status },
    warning: { color: 'bg-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-700', label: status },
    danger: { color: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700', label: status },
    neutral: { color: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600', label: status },
  }
  const cfg = configs[resolvedKey] || configs.neutral

  if (variant === 'pill') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${className}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.color}`}></span>
        {cfg.label}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.color}`}></span>
      {cfg.label}
    </span>
  )
}

export function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const delayClass = delay > 0 ? ` reveal-delay-${delay}` : ''
  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? ' is-visible' : ''}${delayClass} ${className}`}
    >
      {children}
    </Tag>
  )
}

export function PageHero({ eyebrow, title, subtitle, children, className = '' }) {
  return (
    <section className={`bg-gradient-to-r from-green-700 to-emerald-800 py-12 px-4 text-white ${className}`}>
      <div className="mx-auto max-w-7xl">
        {eyebrow && (
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-green-200">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-green-100">{subtitle}</p>}
        {children}
      </div>
    </section>
  )
}

export function SearchBar({ value, onChange, onSubmit, placeholder = 'Search...', className = '' }) {
  return (
    <form onSubmit={onSubmit} role="search" className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-all outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
      />
    </form>
  )
}

export function ErrorAlert({ title = 'Something went wrong', message }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <h3 className="font-medium">{title}</h3>
        {message && <p className="mt-1 text-sm opacity-90">{message}</p>}
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  actionAs,
  actionTo,
  className = '',
}) {
  const ActionTag = actionAs || 'button'
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
        {Icon && <Icon className="h-8 w-8 text-gray-400" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="mb-4 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && actionLabel && (
        <Button variant="primary" size="sm" icon={ShoppingCart} onClick={action} as={ActionTag} to={actionTo}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export function DataTable({
  columns,
  data,
  emptyMessage = 'No data to display',
  loading = false,
  rowKey = 'id',
  onRowClick,
  className = '',
  header,
  headerAction,
}) {
  if (loading) {
    return (
      <Card border className="overflow-hidden">
        <div className="animate-pulse">
          <div className="flex items-center justify-between bg-gray-50 px-6 py-3.5 border-b border-gray-100">
            {columns.map((col) => (
              <div key={col.key} className="h-3 w-24 rounded bg-gray-200" />
            ))}
          </div>
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-0">
              {columns.map((col) => (
                <div key={col.key} className="h-3 flex-1 rounded bg-gray-200" />
              ))}
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card border className={`overflow-hidden ${className}`}>
      {header && (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              {typeof header === 'string' ? (
                <h2 className="text-lg font-semibold text-gray-900">{header}</h2>
              ) : header}
            </div>
            {headerAction}
          </div>
        </div>
      )}
      {(!data || data.length === 0) ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row) => (
                <tr
                  key={row[rowKey] || Math.random()}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} hover:bg-gray-50/80`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-4 text-sm align-top ${col.className || 'text-gray-700'}`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
