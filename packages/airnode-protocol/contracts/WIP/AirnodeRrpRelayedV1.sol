// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodeRrpV1.sol";
import "./interfaces/IAirnodeRrpRelayedV1.sol";

/// @title Airnode request–response protocol (RRP), relayed
/// @notice Differently from RRP, relayed RRP allows the requester to specify
/// an Airnode that will sign the fulfillment and a relayer that will report
/// the signed fulfillment
/// @dev Unlike the other protocols, the event for relayed RRP has the address
/// of the relayer indexed. This is because the relayer will need to listen for
/// requests and fulfillments.
contract AirnodeRrpRelayedV1 is AirnodeRrpV1, IAirnodeRrpRelayedV1 {
    using ECDSA for bytes32;

    /// @notice Called by the requester to make a request to be fulfilled by a
    /// relayer
    /// @dev The response to this request is required to be signed by the
    /// respective Airnode, which will be used by the relayer while fulfilling
    /// the request
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param relayer Relayer address
    /// @param sponsor Sponsor address
    /// @param fulfillFunctionId Selector of the function to be called for
    /// fulfillment
    /// @return requestId Request ID
    function makeRequestRelayed(
        bytes32 templateId,
        bytes calldata parameters,
        address relayer,
        address sponsor,
        bytes4 fulfillFunctionId
    ) external override returns (bytes32 requestId) {
        address airnode = templates[templateId].airnode;
        require(airnode != address(0), "Template does not exist");
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        require(fulfillFunctionId != bytes4(0), "Function selector zero");
        require(
            sponsor == msg.sender ||
                sponsorToRequesterToSponsorshipStatus[sponsor][msg.sender],
            "Requester not sponsored"
        );
        requestId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                requesterToRequestCountPlusOne[msg.sender],
                templateId,
                parameters,
                relayer,
                sponsor,
                fulfillFunctionId
            )
        );
        requestIdToFulfillmentParameters[requestId] = keccak256(
            abi.encodePacked(airnode, msg.sender, relayer, fulfillFunctionId)
        );
        emit MadeRequestRelayed(
            relayer,
            requestId,
            airnode,
            msg.sender,
            requesterToRequestCountPlusOne[msg.sender]++,
            templateId,
            parameters,
            sponsor,
            fulfillFunctionId
        );
    }

    /// @notice Called by the relayer to fulfill the request with the
    /// Airnode-signed response
    /// @dev The hash that Airnode signs includes the address of the sponsor
    /// wallet that is controlled by the relayer, which will be sending the
    /// transaction where this method is called. The Airnode should verify
    /// that this address is indeed derived from `relayer` and `sponsor`
    /// specified in the request, and reject to sign if it is not.
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param requester Requester address
    /// @param relayer Relayer address
    /// @param fulfillFunctionId Selector of the function to be called for
    /// fulfillment
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data
    /// @param signature Request ID, a timestamp, the sponsor wallet address
    /// and the fulfillment data signed by the Airnode address
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillRequestRelayed(
        bytes32 requestId,
        address airnode,
        address requester,
        address relayer,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        require(
            keccak256(
                abi.encodePacked(airnode, requester, relayer, fulfillFunctionId)
            ) == requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        require(
            (
                keccak256(
                    abi.encodePacked(requestId, timestamp, msg.sender, data)
                ).toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
        delete requestIdToFulfillmentParameters[requestId];
        (callSuccess, callData) = requester.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSelector(
                fulfillFunctionId,
                requestId,
                timestamp,
                data
            )
        );
        if (callSuccess) {
            emit FulfilledRequestRelayed(
                relayer,
                requestId,
                airnode,
                timestamp,
                data
            );
        } else {
            // We do not bubble up the revert string from `callData`
            emit FailedRequestRelayed(
                relayer,
                requestId,
                airnode,
                timestamp,
                "Fulfillment failed unexpectedly"
            );
        }
    }

    /// @notice Called by the relayer if the request cannot be fulfilled
    /// @dev Since failure may also include problems at the Airnode end (such
    /// as it being unavailable), we are content with a signature from the
    /// relayer to validate failures. This is acceptable because explicit
    /// failures are mainly for easy debugging of issues, and the requester
    /// should always consider denial of service from a relayer or an Airnode
    /// to be a possibility.
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param requester Requester address
    /// @param relayer Relayer address
    /// @param timestamp Timestamp used in the signature
    /// @param errorMessage A message that explains why the request has failed
    /// @param signature Request ID, a timestamp and the sponsor wallet address
    /// signed by the relayer address
    function failRequestRelayed(
        bytes32 requestId,
        address airnode,
        address requester,
        address relayer,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        string calldata errorMessage,
        bytes calldata signature
    ) external override {
        require(
            keccak256(
                abi.encodePacked(airnode, requester, relayer, fulfillFunctionId)
            ) == requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        require(
            (
                keccak256(abi.encodePacked(requestId, timestamp, msg.sender))
                    .toEthSignedMessageHash()
            ).recover(signature) == relayer,
            "Signature mismatch"
        );
        delete requestIdToFulfillmentParameters[requestId];
        emit FailedRequestRelayed(
            relayer,
            requestId,
            airnode,
            timestamp,
            errorMessage
        );
    }
}
