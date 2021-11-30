const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');

module.exports = {
  devtool: 'source-map',
  entry: {
    index: './dist/src/entrypoint.js',
    'handlers/aws/index': './dist/src/handlers/aws/index.js',
    'handlers/gcp/index': './dist/src/handlers/gcp/index.js',
  },
  mode: 'production',
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, '.webpack'),
  },
  resolve: {
    mainFields: ['main'],
  },
  target: 'node',
  plugins: [
    // https://github.com/api3dao/airnode/pull/623#discussion_r729083235
    new CopyPlugin({
      patterns: [
        { from: '../airnode-validator/dist/templates', to: 'templates' },
        { from: '../airnode-validator/dist/conversions', to: 'conversions' },
      ],
    }),
    new IgnoreDynamicRequire(),
  ],
};
