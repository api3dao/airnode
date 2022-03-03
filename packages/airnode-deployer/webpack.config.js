const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const IgnoreDynamicRequire = require('webpack-ignore-dynamic-require');
const { ESBuildMinifyPlugin } = require('esbuild-loader');

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
          loader: 'ts',
          target: 'es2015',
        },
        exclude: /node_modules/,
      },
    ],
  },
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
  optimization: {
    minimizer: [
      new ESBuildMinifyPlugin({
        target: 'es2015', // Syntax to compile to (see options below for possible values)
      }),
    ],
  },
};
