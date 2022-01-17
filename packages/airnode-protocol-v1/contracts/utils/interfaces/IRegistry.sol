// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../access-control-registry/interfaces/IAccessControlRegistryAdminned.sol";

interface IRegistry is IAccessControlRegistryAdminned {
    function deriveAdminRole(address user)
        external
        view
        returns (bytes32 adminRole);

    function deriveRegistrarRole(address user)
        external
        view
        returns (bytes32 registrarRole);

    // solhint-disable-next-line func-name-mixedcase
    function REGISTRAR_ROLE_DESCRIPTION() external view returns (string memory);
}
