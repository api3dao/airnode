FROM node:12.19.0-alpine3.12

ENV NODE_ENV production

WORKDIR /airnode
COPY . /airnode

# Need git to install dependencies
RUN apk update \
    && apk add git

RUN yarn run bootstrap
RUN yarn run build

CMD if [ -z ${CONFIG_FILENAME+x} ]; then cp out/$CONFIG_FILENAME packages/deployer/src/config-data/config.json; fi \
    && if [ -z ${SECRETS_FILENAME+x} ]; then cp out/$SECRETS_FILENAME packages/deployer/src/config-data/security.env; fi \
    && if [ -z ${RECEIPT_FILENAME+x} ]; then cp out/$RECEIPT_FILENAME packages/deployer/receipt.json; fi \
    && cd /airnode/packages/deployer \
    && yarn run sls:config \
    && yarn run command:$COMMAND \
    if [ -z ${OUTPUT_FILENAME+x} ]; then cp $OUTPUT_FILENAME ../../out; else cp receipt.json ../../out; fi
