#!/usr/bin/env bash

cd ../..
yarn run bootstrap
cd packages/protocol
mv package.json package.monorepo.json
mv package.publish.json package.json
cd ../..
yarn run build:protocol
cd packages/protocol
npm publish
mv package.json package.publish.json
mv package.monorepo.json package.json
