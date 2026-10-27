import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Truck,
  Shield,
  ArrowRight,
  MapPin,
  Users,
  Package,
  Star,
  BarChart3,
  Loader2,
  Search,
  CheckCircle2,
  Award,
  Clock,
  Handshake,
  Smartphone,
} from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  Card,
  RatingStars,
  Price,
  LazyImage,
  SectionHeader,
  EmptyState,
  Reveal,
} from '../components/UI';

const STAT_ICONS = { Users, Package, Shield, MapPin, BarChart3 };

function QuoteIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.5 5.5C6.46 6.9 4.5 9.63 4.5 13v5.5h6.5V12H7.6c.1-1.6.9-3.05 2.4-3.9l-.5-2.6Zm9 0C15.46 6.9 13.5 9.63 13.5 13v5.5H20V12h-3.4c.1-1.6.9-3.05 2.4-3.9l-.5-2.6Z" />
    </svg>
  );
}

const VALUE_PROPS = [
  {
    icon: Shield,
    title: 'Verified Sellers',
    desc: 'Every vendor is vetted and verified before they can list a single grain.',
  },
  {
    icon: Handshake,
    title: 'Fair, Transparent Pricing',
    desc: 'See live market rates so you always know you are paying a fair price.',
  },
  {
    icon: Truck,
    title: 'Nationwide Delivery',
    desc: 'Reliable transport and logistics partners deliver to all 26 regions.',
  },
  {
    icon: Clock,
    title: 'Fast Settlement',
    desc: 'Secure escrow payments release quickly once delivery is confirmed.',
  },
];

const TRUST_BADGES = [
  'Verified Vendors',
  'Secure Escrow',
  'Nationwide Delivery',
  'Fair Pricing',
];

const CROPS = [
  { name: 'Rice', slug: 'rice' },
  { name: 'Maize', slug: 'maize' },
  { name: 'Groundnuts', slug: 'groundnuts' },
  { name: 'Sesame', slug: 'sesame' },
  { name: 'Beans', slug: 'beans' },
  { name: 'Wheat', slug: 'wheat' },
];

const HOW_IT_WORKS = [
  {
    icon: ShoppingCart,
    iconWrap: 'bg-green-50 group-hover:bg-green-100',
    iconColor: 'text-green-600',
    title: 'Browse Products',
    desc: 'Explore thousands of grain products from verified sellers across Tanzania',
  },
  {
    icon: Shield,
    iconWrap: 'bg-blue-50 group-hover:bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Secure Payment',
    desc: 'Pay securely directly to sellers with verified payment confirmation',
  },
  {
    icon: Truck,
    iconWrap: 'bg-amber-50 group-hover:bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Fast Delivery',
    desc: 'Get your order delivered to your doorstep with real-time tracking',
  },
];

const FALLBACK_STATS = [
  { label: 'Happy Customers', value: '5,000+', icon: 'Users' },
  { label: 'Products', value: '500+', icon: 'Package' },
  { label: 'Verified Sellers', value: '200+', icon: 'Shield' },
  { label: 'Regions Covered', value: '26', icon: 'MapPin' },
];

function normalizeStats(stats) {
  if (!stats) return FALLBACK_STATS;
  const arr = Array.isArray(stats) ? stats : Object.values(stats);
  if (arr.length === 0) return FALLBACK_STATS;
  return arr.map((s, i) => ({
    label: s?.label || FALLBACK_STATS[i]?.label || `Stat ${i + 1}`,
    value: s?.value || FALLBACK_STATS[i]?.value || '—',
    icon: s?.icon || FALLBACK_STATS[i]?.icon || 'Package',
  }));
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [marketPrices, setMarketPrices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [partners, setPartners] = useState([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [marketsError, setMarketsError] = useState(null);
  const [cartAddingId, setCartAddingId] = useState(null);
  const [heroSearch, setHeroSearch] = useState('');
  const { addToCart } = useCart();
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const q = heroSearch.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    fetchFeaturedProducts();
    fetchMarketPrices();
    fetchContent();
  }, []);

  const fetchFeaturedProducts = async () => {
    setProductsLoading(true);
    try {
      const data = await api.getProducts({ limit: 8 });
      if (data.success) {
        setProducts(data.products || []);
        setFeaturedProducts((data.products || []).slice(0, 4));
        setProductsError(null);
      } else {
        setProductsError(data.message || 'Failed to load products');
      }
    } catch {
      setProductsError('Failed to connect to server');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchMarketPrices = async () => {
    setMarketsLoading(true);
    try {
      const data = await api.getMarketPrices();
      if (data.success) {
        setMarketPrices((data.prices || []).slice(0, 4));
        setMarketsError(null);
      } else {
        setMarketsError(data.message || 'Failed to load prices');
      }
    } catch {
      setMarketsError('Failed to connect to server');
    } finally {
      setMarketsLoading(false);
    }
  };

  const fetchContent = async () => {
    setContentLoading(true);
    try {
      const [cat, st, tst, prt] = await Promise.all([
        api.getSiteCategories(),
        api.getSiteStats(),
        api.getTestimonials(),
        api.getPartners(),
      ]);
      if (cat.success) setCategories((cat.categories || []).slice(0, 8));
      if (st.success) setStats(normalizeStats(st.stats));
      if (tst.success) setTestimonials((tst.testimonials || []).slice(0, 3));
      if (prt.success) setPartners(prt.partners || []);
    } catch (err) {
      console.error('Failed to load site content', err);
    } finally {
      setContentLoading(false);
    }
  };

  const handleAddToCart = async (productId) => {
    if (!user) {
      toastError('Please log in to add items to your cart');
      return;
    }
    setCartAddingId(productId);
    try {
      await addToCart(productId, 1);
      success('Added to cart');
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'Failed to add to cart';
      toastError(msg);
      console.error('Add to cart error:', err);
    } finally {
      setCartAddingId(null);
    }
  };

  function formatTZS(amount) {
    if (amount === null || amount === undefined || amount === '') return '—';
    const num = Number(amount);
    if (Number.isNaN(num)) return '—';
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  return (
    <div className="min-h-screen">
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden text-white"
      >
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: 'url(/best.png)' }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-green-950/85 via-green-900/80 to-emerald-950/85" aria-hidden="true" />
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true">
          <svg width="100%" height="100%">
            <pattern id="hero-pattern" x="0" y="0" width="56" height="56" patternUnits="userSpaceOnUse">
              <circle cx="28" cy="28" r="1.5" fill="white" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#hero-pattern)" />
          </svg>
        </div>
        <div
          className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-green-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-yellow-400/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 lg:pb-28 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="rise-in inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-md">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
              </span>
              Tanzania&rsquo;s #1 Agricultural Marketplace
            </div>

            <h1
              id="hero-heading"
              className="rise-in mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl xl:text-7xl"
              style={{ animationDelay: '80ms' }}
            >
              <span className="block">Smart Grain Trading</span>
              <span className="mt-2 block bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                for Tanzania
              </span>
            </h1>

            <p
              className="rise-in mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-green-50/90 md:text-xl"
              style={{ animationDelay: '160ms' }}
            >
              Connecting farmers, wholesalers, retailers, and buyers across Tanzania.
              Fresh grains, fair prices, nationwide delivery.
            </p>

            <form
              onSubmit={handleHeroSearch}
              role="search"
              className="rise-in mx-auto mt-9 flex max-w-xl items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-2xl backdrop-blur"
              style={{ animationDelay: '240ms' }}
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search rice, maize, groundnuts..."
                  aria-label="Search products"
                  className="w-full rounded-xl border-0 bg-transparent py-3 pl-11 pr-3 text-base text-gray-900 placeholder-gray-400 outline-none"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Search
              </button>
            </form>

            <div
              className="rise-in mt-8 flex flex-wrap items-center justify-center gap-2.5"
              style={{ animationDelay: '320ms' }}
            >
              {TRUST_BADGES.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-green-50/90 backdrop-blur-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <nav aria-label="Quick crop links" className="mt-16">
            <p className="mb-5 text-center text-sm font-medium uppercase tracking-wider text-green-200/80">
              Shop by Crop
            </p>
            <div className="mx-auto grid max-w-4xl grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
              {CROPS.map((crop, i) => (
                <NavLink
                  key={crop.slug}
                  to={`/products?type=${crop.slug}`}
                  className="rise-in group flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                  style={{ animationDelay: `${380 + i * 60}ms` }}
                >
                  <Package
                    className="h-6 w-6 text-yellow-400 transition-transform duration-300 group-hover:scale-110"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold sm:text-sm">{crop.name}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </section>

      <section aria-labelledby="stats-heading" className="relative z-10 -mt-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-900/5">
            {contentLoading ? (
              <div
                className="grid grid-cols-2 gap-px bg-gray-100 md:grid-cols-4"
                aria-busy="true"
                aria-label="Loading stats"
              >
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white px-6 py-8 text-center">
                    <div className="mx-auto mb-3 h-12 w-12 animate-pulse rounded-xl bg-gray-100" />
                    <div className="mx-auto mb-2 h-6 w-16 animate-pulse rounded bg-gray-100" />
                    <div className="mx-auto h-3 w-24 animate-pulse rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-px bg-gray-100 md:grid-cols-4">
                <h2 id="stats-heading" className="sr-only">
                  Platform Statistics
                </h2>
                {stats.map((stat, i) => {
                  const Icon = STAT_ICONS[stat.icon] || Package;
                  return (
                    <div
                      key={stat.id || i}
                      className="group bg-white px-6 py-8 text-center transition-colors hover:bg-green-50/40"
                    >
                      <div
                        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-100"
                        aria-hidden="true"
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="value-heading" className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-600">
                Why Nafaka Hub
              </p>
              <h2 id="value-heading" className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
                Built for trust at every step
              </h2>
              <p className="mt-4 text-base text-gray-600">
                Everything you need to buy and sell grain with confidence, from verification to
                delivery.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((prop, i) => (
              <Reveal key={prop.title} delay={(i % 4) + 1}>
                <div className="group h-full rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-xl hover:shadow-green-900/5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white">
                    <prop.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">{prop.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{prop.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionHeader
              title="Shop by Category"
              subtitle="Explore our wide range of agricultural products sourced directly from verified farmers across Tanzania"
            />
          </Reveal>
          {contentLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat, i) => (
                <Reveal key={cat.id} delay={(i % 3) + 1}>
                  <NavLink
                    to={`/products?type=${cat.slug}`}
                    className="group block h-full overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-900/5"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <LazyImage
                        src={
                          cat.image_url ||
                          'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'
                        }
                        alt={cat.name}
                        aspect="16:9"
                        className="h-44"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>
                    <div className="p-6">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-green-700">
                          {cat.name}
                        </h3>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white">
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-500 line-clamp-2">
                        {cat.description}
                      </p>
                    </div>
                  </NavLink>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="featured-heading" className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionHeader
              title="Featured Products"
              subtitle="Top-quality grains from verified sellers"
              action={
                <NavLink
                  to="/products"
                  className="group inline-flex items-center gap-2 rounded-lg font-medium text-green-600 transition-colors hover:text-green-700"
                  aria-label="View all products"
                >
                  View All
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </NavLink>
              }
            />
          </Reveal>
          {productsLoading ? (
            <div
              className="flex items-center justify-center h-64"
              aria-busy="true"
              aria-label="Loading products"
            >
              <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
            </div>
          ) : productsError ? (
            <div className="text-center py-12" role="alert">
              <p className="text-red-500 mb-4">{productsError}</p>
              <Button onClick={fetchFeaturedProducts} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : featuredProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products available"
              description="Check back soon for new grain listings from our verified sellers."
              action={fetchFeaturedProducts}
              actionLabel="Refresh"
            />
          ) : (
            <div
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              role="list"
            >
              {featuredProducts.map((product, i) => (
                <Reveal key={product.id} delay={(i % 4) + 1} className="h-full">
                  <Card
                    hover
                    className="group flex h-full flex-col overflow-hidden p-0"
                    role="listitem"
                  >
                    <NavLink
                      to={`/products/${product.id}`}
                      className="block"
                      aria-label={`View ${product.name}`}
                    >
                      <div className="relative overflow-hidden">
                        <LazyImage
                          src={
                            product.image_url
                              ? product.image_url.startsWith('http')
                                ? product.image_url
                                : `images/${product.image_url}`
                              : undefined
                          }
                          alt={product.name}
                          aspect="16:9"
                          className="h-40"
                          placeholderText="No Image"
                        />
                        <div
                          className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 backdrop-blur-sm"
                          aria-label={`Rating: ${product.average_rating ? parseFloat(product.average_rating).toFixed(1) : '0.0'} out of 5`}
                        >
                          <Star
                            className="h-3 w-3 text-yellow-500 fill-yellow-500"
                            aria-hidden="true"
                          />
                          <span className="text-xs font-medium text-gray-700">
                            {product.average_rating
                              ? parseFloat(product.average_rating).toFixed(1)
                              : '0.0'}
                          </span>
                        </div>
                      </div>
                    </NavLink>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="mb-1 font-semibold text-gray-900 transition-colors group-hover:text-green-700">
                        {product.name}
                      </h3>
                      <p className="mb-4 text-sm leading-relaxed text-gray-500 line-clamp-2">
                        {product.description || 'Premium agricultural product'}
                      </p>
                      <div className="mt-auto">
                        <Price amount={product.price} weight={product.weight} className="text-lg" />
                      </div>
                    </div>
                    <div className="p-5 pt-0">
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        icon={ShoppingCart}
                        loading={cartAddingId === product.id}
                        disabled={cartAddingId === product.id}
                        onClick={() => handleAddToCart(product.id)}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="market-heading" className="bg-gray-50 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mb-10 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-600">
                Live Market Data
              </p>
              <h2 id="market-heading" className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
                Today&rsquo;s Market Prices
              </h2>
              {marketsLoading ? (
                <p className="mt-3 text-gray-500" aria-busy="true">
                  Loading market prices...
                </p>
              ) : marketsError ? (
                <p className="mt-3 text-red-500" role="alert">
                  {marketsError}
                </p>
              ) : (
                <p className="mx-auto mt-3 max-w-2xl text-gray-600">
                  Live prices from major markets across Tanzania
                </p>
              )}
            </div>
          </Reveal>
          {marketsLoading ? (
            <div
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
              aria-busy="true"
              aria-label="Loading market prices"
            >
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="h-[160px] p-6 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="h-7 w-1/2 rounded bg-gray-200" />
                    <div className="h-4 w-1/4 rounded bg-gray-200" />
                  </div>
                </Card>
              ))}
            </div>
          ) : marketPrices.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No market prices available"
              description="Market data is currently unavailable. Please try again later."
              action={fetchMarketPrices}
              actionLabel="Retry"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" role="list">
              {marketPrices.map((item, index) => {
                const isRising = item.trend === 'up' || item.trend === 'rising';
                const isFalling = item.trend === 'down' || item.trend === 'falling';
                const unit = item.unit || 'kg';
                return (
                  <Reveal key={`${item.id}-${index}`} delay={(index % 4) + 1} className="h-full">
                    <Card
                      hover
                      className="group h-full border border-gray-100 transition-all duration-300 hover:border-green-200 hover:shadow-xl hover:shadow-green-900/5"
                      role="listitem"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">{item.commodity}</h3>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                            isRising
                              ? 'bg-green-50 text-green-700'
                              : isFalling
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-50 text-gray-600'
                          }`}
                          aria-label={
                            isRising ? 'Price rising' : isFalling ? 'Price falling' : 'Price stable'
                          }
                        >
                          {isRising ? '↗ Rising' : isFalling ? '↘ Falling' : 'Stable'}
                        </span>
                      </div>
                      <div
                        className="mb-3 flex items-center gap-1.5 text-sm text-gray-500"
                        aria-hidden="true"
                      >
                        <MapPin className="h-4 w-4 text-green-600" />
                        {item.region}
                      </div>
                      <p className="text-2xl font-extrabold tracking-tight text-gray-900">
                        TZS {formatTZS(item.price)}
                        <span className="text-sm font-normal text-gray-500">/{unit}</span>
                      </p>
                    </Card>
                  </Reveal>
                );
              })}
            </div>
          )}
          {!marketsLoading && !marketsError && marketPrices.length > 0 && (
            <div className="mt-8 text-center">
              <NavLink
                to="/market-prices"
                className="group text-green-600 hover:text-green-700 font-medium flex items-center gap-2 justify-center"
                aria-label="View full market prices"
              >
                View Full Market{' '}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </NavLink>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="testimonials-heading" className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionHeader
              title="What Our Customers Say"
              subtitle="Trusted by thousands of farmers, traders, and businesses across Tanzania"
            />
          </Reveal>
          {contentLoading ? (
            <div
              className="grid grid-cols-1 gap-6 md:grid-cols-3"
              aria-busy="true"
              aria-label="Loading testimonials"
            >
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-[160px] p-6 animate-pulse" />
              ))}
            </div>
          ) : testimonials.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No testimonials yet"
              description="Be the first to share your experience with Nafaka Hub."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3" role="list">
              {testimonials.map((t, i) => (
                <Reveal key={t.id} delay={i + 1} className="h-full">
                  <Card
                    hover
                    className="group flex h-full flex-col border border-gray-100 p-6 transition-all duration-300 hover:border-green-200 hover:shadow-xl hover:shadow-green-900/5"
                    role="listitem"
                  >
                    <QuoteIcon
                      className="mb-3 h-8 w-8 text-green-100 transition-colors duration-300 group-hover:text-green-200"
                      aria-hidden="true"
                    />
                    <div
                      className="mb-4 flex justify-center"
                      aria-label={`${t.rating || 5} out of 5 stars`}
                    >
                      <RatingStars rating={t.rating || 5} size="md" />
                    </div>
                    <blockquote className="mb-6 flex-1 text-center leading-relaxed text-gray-700">
                      &ldquo;{t.text}&rdquo;
                    </blockquote>
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700"
                        aria-hidden="true"
                      >
                        {t.avatar_initials}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{t.name}</p>
                        <p className="text-sm text-gray-500">
                          {[t.role, t.location].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="app-heading" className="bg-gray-50 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-700 via-green-800 to-emerald-900 p-8 text-white shadow-2xl shadow-green-900/20 lg:p-14">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" aria-hidden="true" />
            <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-yellow-400/5" aria-hidden="true" />
            <div className="relative flex flex-col items-center gap-10 lg:flex-row lg:justify-between">
              <div className="text-center lg:text-left">
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
                  <Smartphone className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
                  Mobile App
                </span>
                <h2 id="app-heading" className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  Trade anywhere in Tanzania
                </h2>
                <p className="mx-auto mb-8 mt-4 max-w-xl text-green-100 lg:mx-0">
                  Get real-time price alerts, manage orders, and chat directly with sellers from
                  your phone.
                </p>
                <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
                  <a
                    href="https://apps.apple.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download on the App Store"
                    className="inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-gray-900 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-50"
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    <span className="text-left leading-tight">
                      <span className="block text-[10px] uppercase tracking-wide text-gray-500">Download on the</span>
                      <span className="block text-sm font-semibold">App Store</span>
                    </span>
                  </a>
                  <a
                    href="https://play.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Get it on Google Play"
                    className="inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-gray-900 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-50"
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.61-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.302 2.302a.996.996 0 010 1.38l-2.302 2.302L15.196 12l2.502-2.49zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                    </svg>
                    <span className="text-left leading-tight">
                      <span className="block text-[10px] uppercase tracking-wide text-gray-500">Get it on</span>
                      <span className="block text-sm font-semibold">Google Play</span>
                    </span>
                  </a>
                </div>
              </div>
              <div className="grid w-full max-w-md grid-cols-3 gap-4 text-center">
                {[
                  { value: 'Real-time', label: 'Price alerts' },
                  { value: 'Secure', label: 'Payments' },
                  { value: 'Track', label: 'Orders live' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm transition-colors hover:bg-white/15"
                  >
                    <div className="text-2xl font-extrabold text-white lg:text-3xl">{item.value}</div>
                    <div className="mt-1 text-xs text-green-100">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="partners-heading" className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="mb-10 text-center">
              <h2 id="partners-heading" className="text-2xl font-bold text-gray-900">
                Trusted Partners &amp; Sponsors
              </h2>
              <p className="mt-2 text-gray-500">
                Working with leading organizations to transform agriculture
              </p>
            </div>
          </Reveal>
          {contentLoading ? (
            <div
              className="grid grid-cols-2 gap-6 md:grid-cols-4"
              aria-busy="true"
              aria-label="Loading partners"
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : partners.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No partners listed"
              description="Our partner network is growing. Check back soon."
            />
          ) : (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4" role="list">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-center rounded-xl bg-white p-6 shadow-sm border border-gray-100 text-center transition-shadow hover:shadow-md"
                  role="listitem"
                >
                  <span className="text-sm font-medium text-gray-600 text-center">
                    {partner.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="how-heading" className="bg-gray-50 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <SectionHeader
              title="How It Works"
              subtitle="Simple steps to start trading on Tanzania's most trusted agricultural marketplace"
            />
          </Reveal>
          <div className="relative" aria-label="How it works steps">
            <div
              className="absolute top-8 left-8 right-8 mx-auto hidden h-0.5 max-w-md bg-gray-100 md:block md:left-0 md:right-0"
              aria-hidden="true"
            />
            <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8" role="list">
              {HOW_IT_WORKS.map((step, i) => (
                <Reveal key={step.title} delay={i + 1} className="h-full">
                  <div className="relative flex h-full flex-col items-center text-center">
                    <span
                      className="absolute top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white shadow-sm ring-4 ring-gray-50"
                      aria-label={`Step ${i + 1}`}
                    >
                      {i + 1}
                    </span>
                    <div
                      className={`mb-4 mt-12 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm transition-all duration-300 group-hover:scale-110 ${step.iconWrap}`}
                      aria-hidden="true"
                    >
                      <step.icon className={`h-8 w-8 ${step.iconColor}`} />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-gray-900">
                      {step.title}
                    </h3>
                    <p className="max-w-sm leading-relaxed text-gray-600">{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="cta-heading"
        className="relative overflow-hidden bg-gradient-to-br from-green-800 via-green-900 to-emerald-950 py-16 text-white md:py-24"
      >
        <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-green-500/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-yellow-400/5 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <Reveal>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <Award className="h-4 w-4 text-yellow-400" aria-hidden="true" />
              Join thousands of Tanzanian traders
            </span>
            <h2 id="cta-heading" className="text-3xl font-extrabold tracking-tight md:text-5xl">
              Ready to Start Trading?
            </h2>
            <p className="mx-auto mb-10 mt-5 max-w-2xl text-lg text-green-100">
              Create a free account and start buying and selling grain with verified partners
              today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <NavLink to="/register" className="group" aria-label="Create a free seller account">
                <Button variant="accent" size="lg" icon={ArrowRight} iconPosition="right">
                  Create Free Account
                </Button>
              </NavLink>
              <NavLink to="/products" aria-label="Browse products as a buyer">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/70 text-white hover:bg-white hover:text-green-800"
                >
                  Start Shopping
                </Button>
              </NavLink>
            </div>
            <p className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-green-200/80">
              {['No setup fees', 'Verified sellers', 'Free to join'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-yellow-400" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
