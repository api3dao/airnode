// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodeRrpV1.sol";
import "./interfaces/IAirnodeRrpRelayedV1.sol";

contract AirnodeRrpRelayedV1 is AirnodeRrpV1, IAirnodeRrpRelayedV1 {
    using ECDSA for bytes32;

    function makeRequestRelayed(
        bytes32 templateId,
        bytes calldata parameters,
        address relayer,
        address sponsor,
        address sponsorWallet
    ) external override returns (bytes32 requestId) {
        address airnode = templates[templateId].airnode;
        require(airnode != address(0), "Template does not exist");
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
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
                sponsorWallet
            )
        );
        requestIdToFulfillmentParameters[requestId] = keccak256(
            abi.encodePacked(airnode, msg.sender, relayer, sponsorWallet)
        );
        emit MadeRequestRelayed(
            relayer,
            requestId,
            msg.sender,
            requesterToRequestCountPlusOne[msg.sender]++,
            templateId,
            parameters,
            sponsor,
            sponsorWallet
        );
    }

    function fulfillRequestRelayed(
        bytes32 requestId,
        address airnode,
        address requester,
        address relayer,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        require(
            keccak256(
                abi.encodePacked(airnode, requester, relayer, msg.sender)
            ) == requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        require(
            (
                keccak256(abi.encodePacked(requestId, timestamp, data))
                    .toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
        delete requestIdToFulfillmentParameters[requestId];
        (callSuccess, callData) = requester.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSignature(
                "fulfillRrpRelayed(bytes32,uint256,bytes)",
                requestId,
                timestamp,
                data
            )
        );
        if (callSuccess) {
            emit FulfilledRequestRelayed(relayer, requestId, timestamp, data);
        } else {
            // We do not bubble up the revert string from `callData`
            emit FailedRequestRelayed(
                relayer,
                requestId,
                timestamp,
                "Fulfillment failed unexpectedly"
            );
        }
    }

    function failRequestRelayed(
        bytes32 requestId,
        address airnode,
        address requester,
        address relayer,
        uint256 timestamp,
        string calldata errorMessage
    ) external override {
        require(
            keccak256(
                abi.encodePacked(airnode, requester, relayer, msg.sender)
            ) == requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        delete requestIdToFulfillmentParameters[requestId];
        emit FailedRequestRelayed(relayer, requestId, timestamp, errorMessage);
    }
}
