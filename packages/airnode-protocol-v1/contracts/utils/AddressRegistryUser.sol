// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAddressRegistry.sol";
import "./interfaces/IAddressRegistryUser.sol";

contract AddressRegistryUser is IAddressRegistryUser {
    address public immutable override addressRegistry;

    /// @param _addressRegistry AddressRegistry contract address
    constructor(address _addressRegistry) {
        require(
            _addressRegistry != address(0),
            "Zero address registry address"
        );
        addressRegistry = _addressRegistry;
    }
}
