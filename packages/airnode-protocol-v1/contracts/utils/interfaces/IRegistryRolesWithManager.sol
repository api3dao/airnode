// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../access-control-registry/interfaces/IAccessControlRegistryAdminned.sol";

interface IRegistryRolesWithManager is IAccessControlRegistryAdminned {
    // solhint-disable-next-line func-name-mixedcase
    function REGISTRAR_ROLE_DESCRIPTION() external view returns (string memory);

    function registrarRole() external view returns (bytes32);
}
