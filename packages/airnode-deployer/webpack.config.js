const path = require('path');
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');
const { EsbuildPlugin } = require('esbuild-loader');

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
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)?$/,
        loader: 'esbuild-loader',
        options: {
          target: 'es2021',
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [new IgnoreDynamicRequire()],
  optimization: {
    minimizer: [
      new EsbuildPlugin({
        target: 'es2021', // Syntax to compile to (see options below for possible values)
      }),
    ],
  },
};
