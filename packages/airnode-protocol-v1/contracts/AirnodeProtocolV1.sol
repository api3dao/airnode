// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodePsp.sol";
import "./interfaces/IAirnodeProtocolV1.sol";

/// @title Airnode request–response protocol (RRP), publish–subscribe protocol
/// (PSP), their relayed versions and an additional utility function to verify
/// the signature of the fulfillment of a generic request
contract AirnodeProtocolV1 is AirnodePsp, IAirnodeProtocolV1 {
    using ECDSA for bytes32;

    /// @notice Verifies the signature associated with request parameters, a
    /// timestamp and the response to request specified by the
    /// parameters
    /// @dev Reverts if the verification is not successful
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param timestamp Timestamp used in the signature
    /// @param data Response data
    /// @param signature Request hash, a timestamp and response data signed by
    /// the Airnode address
    function verifySignature(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external view override returns (bytes32 requestHash, address airnode) {
        airnode = templateIdToAirnode[templateId];
        require(airnode != address(0), "Template not registered");
        requestHash = keccak256(abi.encodePacked(templateId, parameters));
        require(
            (
                keccak256(abi.encodePacked(requestHash, timestamp, data))
                    .toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
    }
}
