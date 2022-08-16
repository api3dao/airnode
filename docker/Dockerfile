FROM node:14.19.3-alpine3.15 AS environment

ENV buildDir="/build"

RUN apk add --update --no-cache git rsync docker && \
    yarn global add npm && \
    # Download both solidity compilers as per: https://github.com/nomiclabs/hardhat/issues/1280#issuecomment-949822371
    mkdir -p /root/.cache/hardhat-nodejs/compilers/wasm && \
    wget -O /root/.cache/hardhat-nodejs/compilers/wasm/soljson-v0.8.9+commit.e5eed63a.js https://solc-bin.ethereum.org/wasm/soljson-v0.8.9+commit.e5eed63a.js && \
    wget -O /root/.cache/hardhat-nodejs/compilers/wasm/list.json https://solc-bin.ethereum.org/wasm/list.json && \
    mkdir -p /root/.cache/hardhat-nodejs/compilers/linux-amd64 && \
    wget -O /root/.cache/hardhat-nodejs/compilers/linux-amd64/solc-linux-amd64-v0.8.9+commit.e5eed63a https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-v0.8.9+commit.e5eed63a && \
    wget -O /root/.cache/hardhat-nodejs/compilers/linux-amd64/list.json https://solc-bin.ethereum.org/linux-amd64/list.json

COPY ./entrypoint.sh /entrypoint.sh

WORKDIR ${buildDir}

ENTRYPOINT ["/entrypoint.sh"]