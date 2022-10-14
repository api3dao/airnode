# Coingecko Cross-chain Authorizer Example Integration

The basic coingecko integration has been modified to demonstrate a cross-chain authorizer. There are two authorizer
contracts: one, `NothingAuthorizer`, does not authorize any requests and the other, `EverythingAuthorizer`, authorizes
all requests. The `NothingAuthorizer` contract will be deployed to the first chain, which is the chain specified in the
`chains` array of `config.json` and the same as that on which Airnode will listen for and respond to requests. The
`EverythingAuthorizer` contract will be deployed to the second (cross) chain. With this arrangement, requests will be
authorized by the cross-chain authorizer and not by the same-chain authorizer. In a real use-case, the cross-chain
and/or same chain authorizer contracts would include logic for authorizing requests based on the requester, sponsor,
endpoint, etc.

To run this integration, all of the steps of the `airnode-examples` root-level README need to be followed in order, but
with one addition: the below command must be run prior to deploying the Airnode / running the Airnode container.

```sh
# Run from the <airnode/packages/airnode-examples> directory
yarn ts-node integrations/coingecko-cross-chain-authorizer/deploy-authorizers-and-update-config
```

This script will deploy the contracts described above to their respective chains and update placeholder addresses within
`config.json` with the actual addresses of the deployed contracts.
