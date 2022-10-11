# Coingecko-e2e example integration: for testing only

The basic coingecko integration has been modified for E2E testing of cross-chain authorizer functionality and _is not
meant to be run by a user_. There are two contracts: one, `NothingAuthorizer`, does not authorize any requests and the
other, `EverythingAuthorizer`, authorizes all requests. By using `NothingAuthorizer` within
`requesterEndpointAuthorizers` and `EverythingAuthorizer` within `crossChainRequesterAuthorizers`, the request will be
authorized by the local Hardhat instance using the cross-chain functionality (despite it actually being the same
underlying chain).
