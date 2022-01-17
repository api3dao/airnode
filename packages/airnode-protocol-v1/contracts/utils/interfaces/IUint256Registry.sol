// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IRegistryRolesWithManager.sol";

interface IUint256Registry is IRegistryRolesWithManager {
    event RegisteredUint256(bytes32 id, uint256 uint256_, address sender);

    function registerUint256(bytes32 id, uint256 uint256_) external;

    function tryReadRegisteredUint256(bytes32 id)
        external
        view
        returns (bool success, uint256 uint256_);
}
