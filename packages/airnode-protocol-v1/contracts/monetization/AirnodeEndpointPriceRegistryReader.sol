// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeEndpointPriceRegistryReader.sol";

interface IAirnodeEndpointPriceRegistry {
    function getPrice(
        address airnode,
        uint256 chainId,
        bytes32 endpointId
    ) external view returns (uint256 price);

    // solhint-disable-next-line func-name-mixedcase
    function DENOMINATION() external view returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function DECIMALS() external view returns (uint256);

    // solhint-disable-next-line func-name-mixedcase
    function PRICING_INTERVAL() external view returns (uint256);
}

contract AirnodeEndpointPriceRegistryReader is
    IAirnodeEndpointPriceRegistryReader
{
    /// @notice AirnodeEndpointPriceRegistry contract address
    address public immutable override airnodeEndpointPriceRegistry;

    /// @param _airnodeEndpointPriceRegistry AirnodePriceRegistry contract address
    constructor(address _airnodeEndpointPriceRegistry) {
        require(
            _airnodeEndpointPriceRegistry != address(0),
            "Price registry address zero"
        );
        airnodeEndpointPriceRegistry = _airnodeEndpointPriceRegistry;
    }
}
