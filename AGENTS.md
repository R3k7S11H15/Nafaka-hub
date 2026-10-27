# Nafaka Hub - AGENTS.md

## Project Overview
GrainMart Tanzania ("Nafaka Hub") is an agricultural marketplace connecting farmers, wholesalers, and buyers across Tanzania. The system consists of three components:

1. **Web App** (`/`) - React + Vite + Tailwind CSS (PWA-ready)
2. **Mobile App** (`/mobile/`) - React Native + Expo (iOS & Android)
3. **Backend API** (`/backend-node/`) - Node.js + Express + MySQL

## Architecture

### Shared Code (`src/`)
Business logic lives in `src/` and is shared between web and mobile:

| Path | Description | Platform |
|------|-------------|----------|
| `src/services/api.js` | API client (platform-agnostic: `/api` on web, configurable URL on mobile) | Web + Mobile |
| `src/context/AuthContext.jsx` | Authentication context (JWT tokens) | Web + Mobile |
| `src/context/CartContext.jsx` | Shopping cart context | Web + Mobile |
| `src/config/roles.js` | Role definitions and permissions | Web + Mobile |
| `src/hooks/useSSE.js` | Server-Sent Events hook (graceful no-op on mobile) | Web + Mobile |
| `src/utils/storage.js` | Cross-platform key-value storage (localStorage on web, AsyncStorage on mobile) | Web + Mobile |

### Web App (`/`)
- **Framework**: Vite + React 18
- **Routing**: react-router-dom
- **Styling**: Tailwind CSS
- **Icons**: lucide-react
- **Entry point**: `src/main.jsx`
- **Commands**:
  - `npm run dev` - Start Vite dev server (http://localhost:5173)
  - `npm run build` - Build production bundle

### Mobile App (`/mobile/`)
- **Framework**: Expo (managed workflow, SDK 51) + React Native 0.74
- **Routing**: React Navigation (bottom tabs + native stack)
- **Icons**: lucide-react-native
- **Storage**: @react-native-async-storage/async-storage
- **Entry point**: `mobile/src/index.js`
- **Commands**:
  - `npm run mobile:start` - Start Expo dev server
  - `npm run mobile:android` - Build Android app
  - `npm run mobile:ios` - Build iOS app

#### Mobile App Structure
```
mobile/
├── package.json          # Expo project config
├── app.json              # Expo app config (icons, splash, scheme)
├── babel.config.js       # Babel preset for Expo
├── metro.config.js       # Metro with parent src/ watchFolders
├── assets/               # App icons, splash screens
└── src/
    ├── index.js               # Entry point (providers + navigation)
    ├── navigation/
    │   └── RootNavigator.jsx  # Auth + tab + stack navigation
    ├── components/
    │   ├── UI.js              # Shared UI primitives (Button, Card, Input)
    │   ├── ProductCard.jsx    # Product card component
    │   └── LoadingSpinner.jsx # Loading indicator
    ├── pages/
    │   ├── LoginScreen.jsx
    │   ├── RegisterScreen.jsx
    │   ├── HomeScreen.jsx
    │   ├── ProductsScreen.jsx
    │   ├── ProductDetailScreen.jsx
    │   ├── CartScreen.jsx
    │   ├── CheckoutScreen.jsx
    │   ├── OrdersScreen.jsx
    │   ├── OrderTrackingScreen.jsx
    │   ├── WishlistScreen.jsx
    │   ├── NotificationsScreen.jsx
    │   ├── MarketPricesScreen.jsx
    │   ├── ProfileScreen.jsx
    │   ├── SettingsScreen.jsx
    │   └── MessagesScreen.jsx
    └── icons/
        └── index.js           # lucide-react-native wrapper
```

### Backend API (`/backend-node/`)
- **Framework**: Express.js
- **Database**: MySQL (via mysql2 connection pool)
- **Auth**: JWT + CSRF tokens
- **Port**: 3001 (proxied by Vite at `/api`)
- **Commands**:
  - `cd backend-node && node server.js` - Start Express server
  - Vite proxy: `/api/*` → `http://localhost:3000`

## Running the System

### 1. Start Backend
```bash
cd backend-node
node server.js
# Server starts at http://localhost:3000
```

### 2. Start Web App
```bash
npm run dev
# Available at http://localhost:5173
```

### 3. Start Mobile App
```bash
npm run mobile:start
# Opens Expo dev menu - scan QR code with Expo Go app
```

## Mobile App Configuration

### API URL
Edit `mobile/app.json` → `expo.extra.apiBase` to point to your backend:
- Android emulator: `http://10.0.2.2:3001/api`
- iOS simulator: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

### Build for Production
```bash
# Android
cd mobile
eas build --platform android

# iOS
eas build --platform ios
```

## nTZS Payments

Payments run through the nTZS partner API with the `collections`,
`disbursements`, `treasury` and spend capabilities. **`wallets` is not held**:
nothing provisions an end-user wallet, collections omit `userId` so they land in
the partner treasury, and payouts/bills name a funding source
(`NTZS_FUNDING_USER_ID`).

- `backend-node/services/ntzs/` — client, error catalogue, validation
- `backend-node/services/ntzsPayments.js` — collections, payouts, bills, webhooks
- `backend-node/services/ntzsTreasury.js` — treasury ledger and sub-wallets
- `backend-node/routes/ntzs.js` — REST surface at `/api/ntzs`
- `src/services/ntzs.js` — frontend client
- `backend-node/services/ntzs/configCheck.js` — boot-time configuration guard
- `src/pages/FinanceNtzsPage.jsx` `/finance/ntzs` — finance console
- `src/pages/BillPaymentPage.jsx` `/bills/pay` — customer bill payment
- `backend-node/docs/ntzs-integration.md` — full integration guide
- `backend-node/database/ntzs_payments_schema.sql` — tables to apply

Non-negotiables: whole TZS integers, quotes before any priced operation, an
`Idempotency-Key` on every money-moving call, and `verify` (not retry) when the
outcome is unknown.

Every nTZS money-moving call names a `userId`, and the deployed API rejects a
deposit without one even though the spec marks it optional. Those ids are config,
not code: `NTZS_COLLECTION_USER_ID` (treasury holder that receives collections)
and `NTZS_FUNDING_USER_ID` (holder that funds payouts and bills), both from the
nTZS dashboard. `POST /v1/users` needs the `wallets` grant, which is not held.

## Development Notes

### Shared Code Principles
- All shared code in `src/` must use platform-agnostic APIs
- No direct `localStorage` imports - use `src/utils/storage.js` instead
- No direct `EventSource` imports - use `src/hooks/useSSE.js` instead
- API base URL: `/api` on web (via Vite proxy), configurable via Expo `extra.apiBase` on mobile
- Icons: `lucide-react` for web pages, `lucide-react-native` for mobile pages (via `mobile/src/icons/`)

### Adding New Mobile Pages
1. Create the page in `mobile/src/pages/`
2. Add a route in `mobile/src/navigation/RootNavigator.jsx`
3. Import shared context/services from `../../src/context/` and `../../src/services/`
