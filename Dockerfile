FROM node:12.19.0-alpine3.12

ENV NODE_ENV production

WORKDIR /airnode
COPY . /airnode

# Need git to install dependencies
RUN apk update \
    && apk add git

RUN yarn run bootstrap
RUN yarn run build

CMD cp out/config.json packages/deployer/src/config-data/config.json | true \
    && cp out/secrets.env packages/deployer/src/config-data/secrets.env | true \
    && cp out/$RECEIPT_FILENAME packages/deployer/ | true \
    && cd /airnode/packages/deployer \
    && yarn run sls:config \
    && yarn run command:$COMMAND \
    && cd /airnode \
    && cp packages/deployer/*.receipt.json out | true
