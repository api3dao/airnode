# Integrations

This folder contains integrations showcasing various features and API integrations, which can be run using a basic
Airnode flow. Each integration is self contained in its own folder. The only exception is the contract of the
requester. All requesters are located in the `../contracts` directory.

There need to be a few files for each integration:
- `README.md` - Should explain what the particular integration is about
- `config.json` - See the
  [docs](https://docs.api3.org/airnode/next/grp-providers/guides/build-an-airnode/configuring-airnode.html) for details
- `create-secrets.ts` - A file that will be called by `create-airnode-secrets.ts` to create the `secrets.env` file. See
  the [docs](https://docs.api3.org/airnode/next/grp-providers/guides/build-an-airnode/configuring-airnode.html) for
  details
- `secrets.example.env` - An example file listing the necessary secrets of `secrets.env` file. This is useful for people
  looking the integration on github
- `request-utils.ts` - This file contains functions which are necessary to make the Airnode request

## Adding new integration

> This section is intended for developers, if you are only interested in running the examples you can skip this section 

First, make sure there is not a similar integration already.

When adding an integration you need to do a few things:
1. Pick a `kebab-case` name for your integration and create such folder in this directory and in `../contracts`
2. Create an `Requester.sol` contract in `../contracts/<your-chosen-name>` - Important part is to handle how to decode
   the data received by the Airnode
3. Create all the necessary files (see the section above) for your integration. Some of the files are explained more in
   depth below

Tip: You can get inspired by the existing integrations.

### README.md

Pay special care to the README file and clearly explain what the integration is about and document any extraneous
features.

### config.json

Try to make your integration as simple and focused as possible. Any values that are changing depending on how the
example is run should be interpolated from the `secrets.env` (e.g. `nodeSettings.cloudProvider` depends whether Airnode
is deployed on AWS or run locally).

You only need to define a single trigger in `config.json`, because the `../scripts/request-utils.ts` will use the first
trigger that is listed.

### create-secrets.ts

This file is expected to `export default` a single function, which is used to create the `secrets.env`. This function
can be asynchronous.

### request-utils.ts

This file is expected to `export const` a pair of functions (both can be asynchronous):
- `getEncodedParameters` - Returns the encoded parameters that are passed to the requester contract when making the
  request.
- `printResponse` - Is a function where you can output the data received by the requester contract (and maybe format it
  before showing it to the user). This function received a `requestId` as the only parameter.
