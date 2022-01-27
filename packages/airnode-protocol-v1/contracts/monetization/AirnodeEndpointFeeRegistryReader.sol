// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeEndpointFeeRegistryReader.sol";

interface IAirnodeEndpointFeeRegistry {
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

contract AirnodeEndpointFeeRegistryReader is IAirnodeEndpointFeeRegistryReader {
    /// @notice AirnodeEndpointFeeRegistry contract address
    address public immutable override airnodeEndpointFeeRegistry;

    /// @param _airnodeEndpointFeeRegistry AirnodeFeeRegistry contract address
    constructor(address _airnodeEndpointFeeRegistry) {
        require(
            _airnodeEndpointFeeRegistry != address(0),
            "Fee registry address zero"
        );
        airnodeEndpointFeeRegistry = _airnodeEndpointFeeRegistry;
    }
}
