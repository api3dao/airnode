// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IRegistryRolesWithManager.sol";

interface IAddressRegistry is IRegistryRolesWithManager {
    function tryReadRegisteredAddress(bytes32 id)
        external
        view
        returns (bool success, address address_);
}
