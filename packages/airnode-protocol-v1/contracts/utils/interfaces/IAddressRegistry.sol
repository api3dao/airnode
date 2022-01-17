// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IRegistryRolesWithManager.sol";

interface IAddressRegistry is IRegistryRolesWithManager {
    event RegisteredAddress(bytes32 id, address address_, address sender);

    function registerAddress(bytes32 id, address address_) external;

    function tryReadRegisteredAddress(bytes32 id)
        external
        returns (bool success, address address_);
}
