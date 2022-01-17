// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../access-control-registry/interfaces/IAccessControlRegistryAdminnedWithManager.sol";

interface IAddressRegistry is IAccessControlRegistryAdminnedWithManager {
    event Registered(bytes32 hash_, address address_);

    function register(bytes32 hash_, address address_) external;

    function hasRegistrarRoleOrIsManager(address account)
        external
        view
        returns (bool);

    // solhint-disable-next-line func-name-mixedcase
    function REGISTRAR_ROLE_DESCRIPTION() external view returns (string memory);

    function registrarRole() external view returns (bytes32);

    function hashToAddress(bytes32 hash_)
        external
        view
        returns (address address_);
}
