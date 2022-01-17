// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IRegistry.sol";

interface IUint256Registry is IRegistry {
    event RegisteredUint256(address indexed user, bytes32 id, uint256 uint256_);

    function registerUint256(
        address user,
        bytes32 id,
        uint256 uint256_
    ) external;

    function readRegisteredUint256(address user, bytes32 id)
        external
        view
        returns (uint256);
}
