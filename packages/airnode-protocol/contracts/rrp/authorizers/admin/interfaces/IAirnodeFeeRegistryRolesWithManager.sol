// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeFeeRegistryRolesWithManager {
    function adminRoleDescription() external view returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function AIRNODE_PRICE_SETTER_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function DECIMALS() external view returns (uint8);

    function manager() external view returns (address);

    function adminRole() external view returns (bytes32);

    function defaultPriceSetterRole() external view returns (bytes32);

    function airnodePriceSetterRole() external view returns (bytes32);
}
