// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/AccessControlRegistryAdminnedWithManager.sol";
import "./interfaces/IAddressRegistry.sol";

contract AddressRegistry is
    AccessControlRegistryAdminnedWithManager,
    IAddressRegistry
{
    string public constant override REGISTRAR_ROLE_DESCRIPTION = "Registrar";

    bytes32 public immutable override registrarRole;

    mapping(bytes32 => address) public override hashToAddress;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    )
        AccessControlRegistryAdminnedWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
    {
        registrarRole = _deriveRole(
            _deriveAdminRole(manager),
            keccak256(abi.encodePacked(REGISTRAR_ROLE_DESCRIPTION))
        );
    }

    function register(bytes32 hash_, address address_) external override {
        require(
            hasRegistrarRoleOrIsManager(msg.sender),
            "Sender cannot register"
        );
        hashToAddress[hash_] = address_;
        emit Registered(hash_, address_);
    }

    function hasRegistrarRoleOrIsManager(address account)
        public
        view
        override
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                registrarRole,
                account
            );
    }
}
