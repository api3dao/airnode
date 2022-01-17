// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IRegistry.sol";

interface IAddressRegistry is IRegistry {
    event RegisteredAddress(address indexed user, bytes32 id, address address_);

    function registerAddress(
        address user,
        bytes32 id,
        address address_
    ) external;

    function readRegisteredAddress(address user, bytes32 id)
        external
        view
        returns (address);
}
