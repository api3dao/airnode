// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeTokenLockRolesWithManager {
    function adminRoleDescription() external view returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function ORACLE_ROLE_DESCRIPTION() external view returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function AIRNODE_FEE_REGISTRY_SETTER_ROLE()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function COEFFICIENT_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function OPT_STATUS_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function BLOCK_REQUESTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    function manager() external view returns (address);

    function adminRole() external view returns (bytes32);

    function oracleRole() external view returns (bytes32);

    function airnodeFeeRegistrySetterRole() external view returns (bytes32);

    function coefficientSetterRole() external view returns (bytes32);

    function optStatusSetterRole() external view returns (bytes32);

    function blockWithdrawDestinationSetterRole()
        external
        view
        returns (bytes32);

    function blockRequesterRole() external view returns (bytes32);
}
