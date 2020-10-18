FROM node:12.19.0-alpine3.12

ENV NODE_ENV production
ENV AWS_ACCESS_KEY_ID ""
ENV AWS_SECRET_KEY ""

RUN mkdir /airnode
WORKDIR /airnode

COPY . .
RUN cp packages/node/config.json.example packages/node/config.json
RUN cp packages/node/security.json.example packages/node/security.json

# Need git to install dependencies
RUN apk update
RUN apk add git
RUN yarn bootstrap
RUN yarn global add serverless
RUN cd /usr/local/bin \
    && wget "https://releases.hashicorp.com/terraform/0.13.4/terraform_0.13.4_linux_amd64.zip"  -O terraform.zip \
    && unzip terraform.zip \
    && rm terraform.zip

RUN yarn build

# Download Terraform at runtime
CMD sls config credentials --provider aws --key ${AWS_ACCESS_KEY_ID} --secret ${AWS_SECRET_KEY} \
    && cd /airnode/packages/deployer \
    && npm run deploy \
    && cd /airnode \
    && cp packages/deployer/*.receipt.json out
