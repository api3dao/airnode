FROM node:18.14.0-alpine3.17 AS environment

ENV appDir="/app" \
    buildDir="/build" \
    # Settings to true to convince changesets that this is run in the CI and it shouldn't check for or require 2FA auth
    # https://github.com/changesets/changesets/blob/8c0846977597ddaf51aaeb35f1f0f9428bf8ba14/packages/cli/src/commands/publish/publishPackages.ts#L57
    CI="true"

RUN apk add --update --no-cache git rsync docker $([ $(arch) == "aarch64" ] && echo "python3 make g++") && \
    yarn global add npm@^9.8.1 && \
    # Download both solidity compilers as per: https://github.com/nomiclabs/hardhat/issues/1280#issuecomment-949822371
    mkdir -p /root/.cache/hardhat-nodejs/compilers-v2/wasm && \
    wget -O /root/.cache/hardhat-nodejs/compilers-v2/wasm/soljson-v0.8.9+commit.e5eed63a.js https://solc-bin.ethereum.org/wasm/soljson-v0.8.9+commit.e5eed63a.js && \
    wget -O /root/.cache/hardhat-nodejs/compilers-v2/wasm/list.json https://solc-bin.ethereum.org/wasm/list.json && \
    mkdir -p /root/.cache/hardhat-nodejs/compilers-v2/linux-amd64 && \
    wget -O /root/.cache/hardhat-nodejs/compilers-v2/linux-amd64/list.json https://solc-bin.ethereum.org/linux-amd64/list.json && \
    touch /root/.cache/hardhat-nodejs/compilers-v2/linux-amd64/solc-linux-amd64-v0.8.9+commit.e5eed63a && \
    touch /root/.cache/hardhat-nodejs/compilers-v2/linux-amd64/solc-linux-amd64-v0.8.9+commit.e5eed63a.does.not.work

COPY docker/scripts/dist/*.js ${appDir}/
COPY docker/scripts/dist/*.map ${appDir}/
COPY packages/airnode-admin/docker ${appDir}/airnode-admin
COPY packages/airnode-deployer/docker ${appDir}/airnode-deployer
COPY packages/airnode-node/docker ${appDir}/airnode-client

WORKDIR ${buildDir}

ENTRYPOINT ["node", "/app/index.js"]
