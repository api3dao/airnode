// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/AccessControlRegistryAdminnedWithManager.sol";
import "./interfaces/IRegistryRolesWithManager.sol";

contract RegistryRolesWithManager is
    AccessControlRegistryAdminnedWithManager,
    IRegistryRolesWithManager
{
    string public constant override REGISTRAR_ROLE_DESCRIPTION = "Registrar";

    bytes32 public registrarRole;

    modifier onlyRegistrarOrManager() {
        require(
            msg.sender == manager ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    registrarRole,
                    msg.sender
                ),
            "Sender cannot register"
        );
        _;
    }

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
        registrarRole = _deriveRole(adminRole, REGISTRAR_ROLE_DESCRIPTION);
    }
}
