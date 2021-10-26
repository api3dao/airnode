// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IRrpBeaconServer.sol";

interface IRrpBeaconServerWithManager is IRrpBeaconServer {
    function extendWhitelistExpiration(
        bytes32 templateId,
        address reader,
        uint64 expirationTimestamp
    ) external;

    function setWhitelistExpiration(
        bytes32 templateId,
        address reader,
        uint64 expirationTimestamp
    ) external;

    function setIndefiniteWhitelistStatus(
        bytes32 templateId,
        address reader,
        bool status
    ) external;

    function revokeIndefiniteWhitelistStatus(
        bytes32 templateId,
        address reader,
        address setter
    ) external;
}
