# Nafaka Hub - Mobile App

React Native + Expo mobile app for Nafaka Hub (GrainMart Tanzania).

## Quick Start

```bash
# From the project root
npm run mobile:start

# Or from the mobile directory
cd mobile
npm start
```

Scan the QR code with the **Expo Go** app on your device.

## Project Structure

```
mobile/
├── app.json              # Expo configuration
├── babel.config.js       # Babel config
├── metro.config.js       # Metro bundler (shares code from ../src/)
├── package.json
├── src/
│   ├── index.js          # Entry point - providers + NavigationContainer
│   ├── navigation/
│   │   └── RootNavigator.jsx  # Auth stack + tab + stack navigation
│   ├── components/
│   │   ├── UI.js         # Button, Card, Input, Colors
│   │   ├── ProductCard.jsx
│   │   └── LoadingSpinner.jsx
│   ├── pages/            # Mobile-specific screen components
│   └── icons/
│       └── index.js      # lucide-react-native exports
```

## Shared Code

The mobile app shares business logic with the web app from the parent `src/` directory:

| Shared File | Purpose |
|---|---|
| `../src/services/api.js` | API client (platform-agnostic) |
| `../src/context/AuthContext.jsx` | Authentication context |
| `../src/context/CartContext.jsx` | Shopping cart context |
| `../src/config/roles.js` | Role definitions |
| `../src/hooks/useSSE.js` | SSE hook (no-op on native) |
| `../src/utils/storage.js` | Storage abstraction (AsyncStorage on native) |

The Metro bundler is configured with `watchFolders` and `nodeModulesPaths` in `metro.config.js` to resolve these shared modules and RN-specific packages.

## Configuration

### API Base URL

Edit `mobile/app.json` -> `expo.extra.apiBase`:

- **Android emulator**: `http://10.0.2.2:3000/api`
- **iOS simulator**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

The backend Node.js/Express server runs on port 3000 by default. The Vite web dev server proxies `/api/*` to `http://localhost:3000`.

## Building for Production

```bash
# Using Expo Application Services (EAS)
eas build --platform android
eas build --platform ios

# Or using Expo Go (development only)
npm run android
npm run ios
```

## Available Scripts

| Script | Description |
|---|---|
| `npm start` | Start Expo dev server |
| `npm run android` | Build and run on Android |
| `npm run ios` | Build and run on iOS |
| `npm run lint` | Run ESLint |

## Notes

- The mobile app uses React Native 0.74 with Expo SDK 51
- Icons use `lucide-react-native` (web uses `lucide-react`)
- Navigation uses React Navigation v6 (bottom tabs + native stack)
- SSE real-time updates gracefully degrade to no-op on mobile (no `EventSource`)
