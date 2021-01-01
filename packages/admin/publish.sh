#!/usr/bin/env bash

sed -i 's=@airnode/protocol=@api3/airnode-protocol=g' ./src/evm.ts
sed -i 's=@airnode/airnode-abi=@api3/airnode-abi=g' ./src/index.ts
mv package.json package.monorepo.json
mv package.publish.json package.json
cd ../..
yarn run bootstrap
yarn run build:admin
cd packages/admin
npm publish --access public
sed -i 's=@api3/airnode-protocol=@airnode/protocol=g' ./src/evm.ts
sed -i 's=@api3/airnode-abi=@airnode/airnode-abi=g' ./src/index.ts
mv package.json package.publish.json
mv package.monorepo.json package.json
