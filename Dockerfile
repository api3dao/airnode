FROM node:current-alpine3.12

# Prepare build dir
RUN mkdir /airnode
WORKDIR /airnode

# Copy app contents
COPY . .

# Installing dependencies
#USER root
#RUN npm run bootstrap

# Building app
#RUN npm run build

# Hardcoded ENV variables
#ENV NODE_ENV production

# Run the app
#CMD npm run deploy
