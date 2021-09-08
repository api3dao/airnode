// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IRrpAuthorizer.sol";

interface IRequesterRrpAuthorizer is IRrpAuthorizer {
    event ExtendedWhitelistExpiration(
        address indexed airnode,
        bytes32 indexed endpointId,
        address indexed user,
        uint256 expiration,
        address admin
    );

    event SetWhitelistExpiration(
        address indexed airnode,
        bytes32 indexed endpointId,
        address indexed user,
        uint256 expiration,
        address admin
    );

    event SetWhitelistStatusPastExpiration(
        address indexed airnode,
        bytes32 indexed endpointId,
        address indexed user,
        bool status,
        address admin
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
        returns (uint64 expirationTimestamp, bool whitelistedPastExpiration);
}
