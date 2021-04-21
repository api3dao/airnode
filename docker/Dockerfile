FROM node:12.19.0-alpine3.12

# ENV NODE_ENV production

WORKDIR /airnode
COPY . /airnode

# Need git to install dependencies
RUN apk update \
    && apk add git

RUN yarn run bootstrap
RUN yarn run build

ENTRYPOINT ["docker/entrypoint.sh"]
