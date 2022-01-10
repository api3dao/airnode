// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodePspRelayed.sol";
import "./interfaces/IAirnodeProtocolV1.sol";

contract AirnodeProtocolV1 is AirnodePspRelayed, IAirnodeProtocolV1 {
    using ECDSA for bytes32;

    /// @notice Called to verify the signature associated with a request and
    /// its response, reverts if it fails
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data
    /// @param signature Request hash and fulfillment data signed by the
    /// Airnode address
    function verifySignature(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external view override returns (address airnode, bytes32 requestHash) {
        airnode = templates[templateId].airnode;
        require(airnode != address(0), "Template does not exist");
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
