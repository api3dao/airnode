// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./RegistryRolesWithManager.sol";
import "./interfaces/IAddressRegistry.sol";

contract AddressRegistry is RegistryRolesWithManager, IAddressRegistry {
    mapping(bytes32 => address) private idToAddress;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    )
        RegistryRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
    {}

    function registerAddress(bytes32 id, address address_)
        public
        override
        onlyRegistrarOrManager
    {
        idToAddress[id] = address_;
        emit RegisteredAddress(id, address_, msg.sender);
    }

    function tryReadRegisteredAddress(bytes32 id)
        public
        override
        returns (bool success, address address_)
    {
        address_ = idToAddress[id];
        success = address_ != address(0);
    }
}
