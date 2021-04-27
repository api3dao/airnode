const path = require('path');

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
  target: 'node',
};
