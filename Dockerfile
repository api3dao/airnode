FROM node:12.19.0-alpine3.12

ENV NODE_ENV production
ENV ACTION deploy

ENV AWS_ACCESS_KEY_ID ""
ENV AWS_SECRET_KEY ""
ENV AWS_REGION ""

RUN mkdir /airnode
WORKDIR /airnode

COPY . .
RUN cp packages/node/config.json.example packages/node/config.json \
    && cp packages/node/security.json.example packages/node/security.json
RUN cp packages/deployer/config.json.example packages/deployer/config.json \
    && cp packages/deployer/security.json.example packages/deployer/security.json

# Need git to install dependencies
RUN apk update \
    && apk add git
RUN cd /usr/local/bin \
    && wget "https://releases.hashicorp.com/terraform/0.13.4/terraform_0.13.4_linux_amd64.zip"  -O terraform.zip \
    && unzip terraform.zip \
    && rm terraform.zip

RUN yarn bootstrap
RUN yarn build

CMD cd /airnode/packages/deployer \
    && yarn sls:config \
    # See https://github.com/api3dao/airnode/issues/110
    && sed -i -- "s=<UPDATE_AWS_REGION>=$AWS_REGION=g" /airnode/packages/deployer/terraform/variables.tf.workaround \
    && cp /airnode/packages/deployer/terraform/variables.tf.workaround /airnode/packages/deployer/terraform/variables.tf \
    && yarn terraform:init \
    && yarn $ACTION \
    && cd /airnode \
    && cp packages/deployer/*.receipt.json out
