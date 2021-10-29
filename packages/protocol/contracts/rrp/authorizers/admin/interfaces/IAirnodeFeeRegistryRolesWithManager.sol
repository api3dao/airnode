// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IAirnodeFeeRegistryRolesWithManager {
    function adminRoleDescription() external view returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function GLOBAL_DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function AIRNODE_FLAG_AND_PRICE_SETTER_DESCRIPTION()
        external
        view
        returns (string memory);

    function manager() external view returns (address);

    function adminRole() external view returns (bytes32);

    function globalDefaultPriceSetterRole() external view returns (bytes32);

    function airnodeFlagAndPriceSetterRole() external view returns (bytes32);
}
