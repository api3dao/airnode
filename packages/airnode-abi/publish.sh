#!/usr/bin/env bash

cd ../..
yarn run bootstrap
cd packages/airnode-abi
mv package.json package.monorepo.json
mv package.publish.json package.json
cd ../..
yarn run build:airnode-abi
cd packages/airnode-abi
npm publish
mv package.json package.publish.json
mv package.monorepo.json package.json
