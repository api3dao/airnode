// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../adminnable/interfaces/IWhitelister.sol";
import "./IRrpAuthorizer.sol";

interface IRequesterRrpAuthorizer is IWhitelister, IRrpAuthorizer {
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
