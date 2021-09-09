// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IWhitelister {
    function userIsWhitelisted(bytes32 serviceId, address user)
        external
        view
        returns (bool isWhitelisted);

    function serviceIdToUserToWhitelistStatus(bytes32 serviceId, address user)
        external
        view
        returns (uint64 expirationTimestamp, bool whitelistedPastExpiration);
}
