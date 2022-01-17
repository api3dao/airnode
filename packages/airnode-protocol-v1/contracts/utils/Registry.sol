// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/AccessControlRegistryAdminned.sol";
import "./interfaces/IRegistry.sol";

contract Registry is AccessControlRegistryAdminned, IRegistry {
    string public constant override REGISTRAR_ROLE_DESCRIPTION = "Registrar";

    bytes32 internal constant REGISTRAR_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(REGISTRAR_ROLE_DESCRIPTION));

    modifier onlyRegistrarOrUser(address user) {
        require(
            user == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveRegistrarRole(user),
                    msg.sender
                ),
            "Sender cannot register"
        );
        _;
    }

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    )
        AccessControlRegistryAdminned(
            _accessControlRegistry,
            _adminRoleDescription
        )
    {}

    function deriveAdminRole(address user)
        external
        view
        override
        returns (bytes32 adminRole)
    {
        adminRole = _deriveAdminRole(user);
    }

    function deriveRegistrarRole(address user)
        public
        view
        override
        returns (bytes32 registrarRole)
    {
        registrarRole = _deriveRole(
            _deriveAdminRole(user),
            REGISTRAR_ROLE_DESCRIPTION_HASH
        );
    }
}
