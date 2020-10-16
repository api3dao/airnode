FROM node:12.19.0-alpine3.12

ENV NODE_ENV production

RUN mkdir /airnode
WORKDIR /airnode

COPY . .
RUN cp packages/node/config.json.example packages/node/config.json
RUN cp packages/node/security.json.example packages/node/security.json

# Need git to install dependencies
RUN apk update
RUN apk add git
# Replace ssh with https to not have to deal with keys
RUN sed -i -- 's=git+ssh://git@=git+https://=g' packages/protocol/package-lock.json
RUN npm ci --prefix=packages/protocol
RUN npm run bootstrap

RUN npm run build
