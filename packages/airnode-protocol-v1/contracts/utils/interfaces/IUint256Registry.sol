// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IRegistryRolesWithManager.sol";

interface IUint256Registry is IRegistryRolesWithManager {
    function tryReadRegisteredUint256(bytes32 id)
        external
        view
        returns (bool success, uint256 uint256_);
}
