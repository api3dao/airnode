# Build preparation
FROM node:12-alpine as buildPrep

ARG yarnRegistry

ENV airnodeDir="/opt/airnode"
ENV deployerDir="${airnodeDir}/packages/deployer" \
    YARN_REGISTRY=${yarnRegistry}

RUN apk add --update python make g++ && \
    mkdir -p ${deployerDir}

WORKDIR ${deployerDir}

# Actual build
FROM buildPrep as buildBuild

COPY tsconfig.build.json ${airnodeDir}
COPY packages/deployer ${deployerDir}

RUN yarn install && \
    yarn build

# Necessary NPM packages
FROM buildPrep as buildDependencies

COPY packages/deployer/package.json ${deployerDir}
COPY packages/deployer/yarn.lock ${deployerDir}

ENV NODE_ENV production

RUN yarn install --prod

# Run image
FROM node:12-alpine

ENV name="airnode-deployer" \
    terraformURL="https://releases.hashicorp.com/terraform/0.15.3/terraform_0.15.3_linux_amd64.zip" \
    buildDeployerDir="/opt/airnode/packages/deployer" \
    deployerDir="/opt/deployer" \
    deployerBin="/usr/local/bin/deployer"

LABEL application=${name} \
      description="Arinode Deployer CLI"

RUN apk add --update --no-cache su-exec git
RUN wget ${terraformURL} && \
    unzip *.zip -d /bin && \
    rm -rf *.zip
RUN mkdir -p ${deployerDir}

WORKDIR ${deployerDir}

COPY --from=buildBuild ${buildDeployerDir}/dist ${deployerDir}
COPY --from=buildDependencies ${buildDeployerDir}/node_modules ${deployerDir}/node_modules
COPY docker/entrypoint.sh /entrypoint.sh

RUN ln -s ${deployerDir}/bin/deployer.js ${deployerBin} && \
    chmod +x ${deployerBin}

ENTRYPOINT ["/entrypoint.sh"]
