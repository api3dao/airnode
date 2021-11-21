// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeTokenPaymentRolesWithManager {
    function adminRoleDescription() external view returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function PAYMENT_TOKEN_PRICE_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function AIRNODE_TO_WHITELIST_DURATION_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    // solhint-disable-next-line func-name-mixedcase
    function AIRNODE_TO_PAYMENT_DESTINATION_SETTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

    function manager() external view returns (address);

    function adminRole() external view returns (bytes32);

    function paymentTokenPriceSetterRole() external view returns (bytes32);

    function airnodeToWhitelistDurationSetterRole()
        external
        view
        returns (bytes32);

    function airnodeToPaymentDestinationSetterRole()
        external
        view
        returns (bytes32);
}
