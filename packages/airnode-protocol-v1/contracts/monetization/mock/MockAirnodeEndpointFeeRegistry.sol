// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract MockAirnodeEndpointPriceRegistry {
    string public DENOMINATION; // solhint-disable-line var-name-mixedcase
    uint256 public DECIMALS; // solhint-disable-line var-name-mixedcase
    uint256 public PRICING_INTERVAL; // solhint-disable-line var-name-mixedcase

    constructor(
        string memory denomination,
        uint256 decimals,
        uint256 pricingInterval
    ) {
        DENOMINATION = denomination;
        DECIMALS = decimals;
        PRICING_INTERVAL = pricingInterval;
    }
}
