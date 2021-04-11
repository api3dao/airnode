const path = require('path');

module.exports = {
  devtool: 'source-map',
  entry: {
    'aws/index': './dist/handlers/aws/index.js',
  },
  mode: 'production',
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, '.webpack'),
  },
  target: 'node',
};
