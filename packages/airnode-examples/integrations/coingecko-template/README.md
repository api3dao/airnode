# Coingecko example showing Airnode template request

This example showcases how to use Airnode
[template](https://docs.api3.org/reference/airnode/latest/concepts/template.html) requests. This example defines a
template inside `config.json`, which is used to call the Airnode endpoint called `coinMarketData`. This endpoint can be
called to determine the current price of some crypto currency. This template defines parameters to retrieve the current
price of Ethereum. See the `create-template-on-chain.ts` and `create-config.ts` files for more details.

To run this example, follow the generic examples README. However, before making a template request (before running
`yarn make-request`), you must make sure the template is deployed. The easiest way to ensure this is to re-deploy the
template.

## Redeploying the template on chain

```sh
# Run from the <airnode/packages/airnode-examples> directory
yarn ts-node integrations/coingecko-template/create-template-on-chain.ts
```
