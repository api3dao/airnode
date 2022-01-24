// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./AirnodeRequester.sol";
import "./interfaces/IAirnodeRequesterAndSignatureVerifier.sol";

/// @title Contract to be inherited to make Airnode requests, receive
/// fulfillments and verify signatures
contract AirnodeRequesterAndSignatureVerifier is
    AirnodeRequester,
    IAirnodeRequesterAndSignatureVerifier
{
    using ECDSA for bytes32;

    // The template ID to Airnode address mapping is cached to avoid having to
    // make repeated external calls
    mapping(bytes32 => address) private templateIdToAirnode;

    /// @param _airnodeProtocol AirnodeProtocol contract address
    constructor(address _airnodeProtocol) AirnodeRequester(_airnodeProtocol) {}

    /// @notice Verifies the signature associated with request parameters, a
    /// timestamp and the response to the request specified by the parameters
    /// @dev Reverts if the verification is not successful
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param timestamp Timestamp used in the signature
    /// @param data Response data
    /// @param signature Request hash, a timestamp and response data signed by
    /// the Airnode address
    /// @return requestHash Request hash, composed of the template ID and the
    /// additional parameters
    function verifySignature(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) internal returns (bytes32 requestHash) {
        address airnode = templateIdToAirnode[templateId];
        if (airnode == address(0)) {
            airnode = IAirnodeProtocol(airnodeProtocol).templateIdToAirnode(
                templateId
            );
            require(airnode != address(0), "Not registered at protocol");
            // Cache for future use
            templateIdToAirnode[templateId] = airnode;
        }
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
