const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-native-screens@4.16.0 has a broken "react-native" field in its
// package.json pointing to "src/index" which doesn't exist in the published
// npm package. Override resolution for this specific module only.
const origResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-screens') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/react-native-screens/lib/commonjs/index.js'
      ),
      type: 'sourceFile',
    };
  }
  if (origResolve) {
    return origResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
