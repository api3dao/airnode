#!/usr/bin/env bash

sed -i 's=@airnode/protocol=@api3/airnode-protocol=g' ./src/evm.ts
mv package.json package.monorepo.json
mv package.publish.json package.json
cd ../..
yarn run bootstrap
yarn run build:admin
cd packages/admin
npm publish --access public
sed -i 's=@api3/airnode-protocol=@airnode/protocol=g' ./src/evm.ts
mv package.json package.publish.json
mv package.monorepo.json package.json
