FROM node:12.19.0-alpine3.12

ENV NODE_ENV production

# Prepare build dir
RUN mkdir /airnode
WORKDIR /airnode

# Copy app contents
COPY . .

RUN apk update
RUN apk add git

# Installing dependencies
RUN npm run bootstrap

# Building app
RUN npm run build
