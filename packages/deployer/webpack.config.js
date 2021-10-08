const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: 'source-map',
  entry: {
    'handlers/aws/index': './dist/src/handlers/aws/index.js',
  },
  externals: '../../config-data/config.json',
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
    new CopyPlugin({
      patterns: [
        { from: '../validator/dist/templates', to: 'templates' },
        { from: '../validator/dist/conversions', to: 'conversions' },
      ],
    }),
  ],
};
