const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const mobileNodeModules = path.resolve(__dirname, 'node_modules');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  /.*\/node_modules\/.*\/node_modules\/.*/,
  /.*\/node_modules\/jest\/.*/,
  /.*\/node_modules\/@types\/.*/,
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'missing-asset-registry-path') {
    return context.resolveRequest(
      { ...context, nodeModulesPaths: [mobileNodeModules] },
      require.resolve('./src/mocks/missing-asset-registry-path'),
      platform
    );
  }

  // Force react-native-gesture-handler to use its compiled main entry
  // (the blockList blocks node_modules/*/src/ paths)
  if (moduleName === 'react-native-gesture-handler') {
    return context.resolveRequest(
      { ...context, nodeModulesPaths: [mobileNodeModules] },
      require.resolve('react-native-gesture-handler/lib/commonjs/index.js'),
      platform
    );
  }

  if (moduleName.startsWith('react') || moduleName.startsWith('@react') ||
      moduleName.startsWith('react-native') || moduleName.startsWith('expo')) {
    return context.resolveRequest(
      { ...context, nodeModulesPaths: [...(context.nodeModulesPaths || []), mobileNodeModules] },
      moduleName,
      platform
    );
  }

  if (moduleName.startsWith('@babel/')) {
    return context.resolveRequest(
      { ...context, nodeModulesPaths: [...(context.nodeModulesPaths || []), mobileNodeModules] },
      moduleName,
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.watchFolders = [
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, '../src'),
];

module.exports = config;