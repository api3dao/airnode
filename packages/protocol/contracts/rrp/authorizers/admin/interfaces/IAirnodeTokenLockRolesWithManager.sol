// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IAirnodeTokenLockRolesWithManager {
    function adminRoleDescription() external view returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function ORACLE_ADDRESS_SETTER_ROLE_DESCRIPTION()
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

    // solhint-disable-next-line func-name-mixedcase
    function REQUESTER_AUTHORIZER_WITH_MANAGER_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    function manager() external view returns (address);

    function adminRole() external view returns (bytes32);

    function oracleAddressSetterRole() external view returns (bytes32);

    function optStatusSetterRole() external view returns (bytes32);

    function blockWithdrawDestinationSetterRole()
        external
        view
        returns (bytes32);

    function blockRequesterRole() external view returns (bytes32);

    function requesterAuthorizerWithManagerSetterRole()
        external
        view
        returns (bytes32);
}
