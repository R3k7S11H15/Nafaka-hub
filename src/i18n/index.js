const translations = {
  en: {
    admin: {
      dashboard: 'Dashboard',
      products: 'Products',
      orders: 'Orders',
      users: 'Users',
      finance: 'Finance',
      support: 'Support',
      disputes: 'Disputes',
      promotions: 'Promotions',
      coupons: 'Coupons',
      tax: 'Tax/VAT',
      categories: 'Categories',
      attributes: 'Attributes',
      moderation: 'Content Moderation',
      templates: 'Templates',
      analytics: 'Analytics',
    },
    common: {
      search: 'Search',
      filter: 'Filter',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      loading: 'Loading...',
      noData: 'No data found',
      confirm: 'Confirm',
    },
  },
  sw: {
    admin: {
      dashboard: 'Dashibodi',
      products: 'Bidhaa',
      orders: 'Maagizo',
      users: 'Watumiaji',
      finance: 'Fedha',
      support: 'Msaada',
      disputes: 'Migogoro',
      promotions: 'Uhusiano',
      coupons: 'Kuponi',
      tax: 'Kodi',
      categories: 'Kategoria',
      attributes: 'Sifa',
      moderation: 'Udhibiti Maudhui',
      templates: 'Kifaa',
      analytics: 'Takwimu',
    },
    common: {
      search: 'Tafuta',
      filter: 'Chuja',
      actions: 'Vitendo',
      edit: 'Hariri',
      delete: 'Futa',
      save: 'Hifadhi',
      cancel: 'Ghairi',
      loading: 'Inapakia...',
      noData: 'Hakuni data',
      confirm: 'Thibitisha',
    },
  },
}

let currentLocale = 'en'

function t(key) {
  const keys = key.split('.')
  let value = translations[currentLocale]
  for (const k of keys) {
    value = value?.[k]
  }
  return value || key
}

function setLocale(locale) {
  if (translations[locale]) {
    currentLocale = locale
    storage.setItem('app_locale', locale)
  }
}

function initLocale() {
  try {
    const saved = storage.getItem('app_locale')
    if (saved && translations[saved]) {
      currentLocale = saved
    }
  } catch {
    // ignore
  }
}

export { t, setLocale, initLocale, translations }
