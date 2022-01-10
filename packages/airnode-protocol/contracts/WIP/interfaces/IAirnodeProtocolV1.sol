// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAirnodePspRelayed.sol";

interface IAirnodeProtocolV1 is IAirnodePspRelayed {
    function verifySignature(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external view returns (address airnode, bytes32 requestHash);
}
