// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IRrpAuthorizer.sol";

interface IRequesterRrpAuthorizer is IRrpAuthorizer {
    event ExtendedWhitelistExpiration(
        address indexed airnode,
        bytes32 endpointId,
        address indexed user,
        address indexed admin,
        uint256 expiration
    );

    event SetWhitelistExpiration(
        address indexed airnode,
        bytes32 endpointId,
        address indexed user,
        address indexed admin,
        uint256 expiration
    );

    event SetWhitelistStatusPastExpiration(
        address indexed airnode,
        bytes32 endpointId,
        address indexed user,
        address indexed admin,
        bool status
    );

    function extendWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address user,
        uint64 expirationTimestamp
    ) external;

    function setWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address user,
        uint64 expirationTimestamp
    ) external;

    function setWhitelistStatusPastExpiration(
        address airnode,
        bytes32 endpointId,
        address user,
        bool status
    ) external;

    function userIsWhitelisted(
        address airnode,
        bytes32 endpointId,
        address user
    ) external view returns (bool isWhitelisted);

    function airnodeToEndpointIdToUserToWhitelistStatus(
        address airnode,
        bytes32 endpointId,
        address user
    )
        external
        view
        returns (
            uint64 expirationTimestamp,
            uint192 timesWhitelistedPastExpiration
        );
}
