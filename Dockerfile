FROM node:12.19.0-alpine3.12

ENV NODE_ENV production

WORKDIR /airnode
COPY . /airnode
RUN cp packages/deployer/src/config-data/config.json.example packages/deployer/src/config-data/config.json \
    && cp packages/deployer/src/config-data/security.json.example packages/deployer/src/config-data/security.json

# Need git to install dependencies
RUN apk update \
    && apk add git
RUN cd /usr/local/bin \
    && wget "https://releases.hashicorp.com/terraform/0.13.4/terraform_0.13.4_linux_amd64.zip"  -O terraform.zip \
    && unzip terraform.zip \
    && rm terraform.zip

RUN yarn run bootstrap
RUN yarn run build

CMD cp out/config.json packages/deployer/src/config-data/config.json | true \
    && cp out/security.json packages/deployer/src/config-data/security.json | true \
    && cp out/$RECEIPT_FILENAME packages/deployer/ | true \
    && cd /airnode/packages/deployer \
    && yarn run sls:config \
    && yarn run terraform:init \
    && yarn run command:$COMMAND \
    && cd /airnode \
    && cp packages/deployer/*.receipt.json out | true
