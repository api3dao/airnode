// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./StorageUtils.sol";
import "./SponsorshipUtils.sol";
import "./WithdrawalUtils.sol";
import "../utils/ExtendedMulticall.sol";
import "./interfaces/IAirnodeProtocol.sol";

/// @title Airnode request–response protocol (RRP) and its relayed version
/// @notice Similar to HTTP, RRP allows the requester to specify a one-off
/// request that the Airnode is expected to respond to as soon as possible.
/// The relayed version allows the requester to specify an Airnode that will
/// sign the fulfillment data and a relayer that will report the signed
/// fulfillment.
/// @dev This contract inherits Multicall for Airnodes to be able to make batch
/// static calls to read sponsorship states, and template and subscription
/// details.
/// StorageUtils, SponsorshipUtils and WithdrawalUtils also implement some
/// auxiliary functionality for PSP.
contract AirnodeProtocol is
    StorageUtils,
    SponsorshipUtils,
    WithdrawalUtils,
    ExtendedMulticall,
    IAirnodeProtocol
{
    using ECDSA for bytes32;

    /// @notice Number of requests the requester made
    /// @dev This can be used to calculate the ID of the next request that the
    /// requester will make
    mapping(address => uint256) public override requesterToRequestCount;

    mapping(bytes32 => bytes32) private requestIdToFulfillmentParameters;

    /// @notice Called by the requester to make a request
    /// @dev If the `templateId` is zero, the fulfillment will be made with
    /// `parameters` being used as fulfillment data
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param sponsor Sponsor address
    /// @param fulfillFunctionId Selector of the function to be called for
    /// fulfillment
    /// @return requestId Request ID
    function makeRequest(
        address airnode,
        bytes32 templateId,
        bytes calldata parameters,
        address sponsor,
        bytes4 fulfillFunctionId
    ) external override returns (bytes32 requestId) {
        require(airnode != address(0), "Airnode address zero");
        require(templateId != bytes32(0), "Template ID zero");
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        require(sponsor != address(0), "Sponsor address zero");
        require(fulfillFunctionId != bytes4(0), "Fulfill function ID zero");
        uint256 requesterRequestCount = ++requesterToRequestCount[msg.sender];
        requestId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                requesterRequestCount,
                airnode,
                templateId,
                parameters,
                sponsor,
                fulfillFunctionId
            )
        );
        requestIdToFulfillmentParameters[requestId] = keccak256(
            abi.encodePacked(airnode, msg.sender, fulfillFunctionId)
        );
        emit MadeRequest(
            airnode,
            requestId,
            msg.sender,
            requesterRequestCount,
            templateId,
            parameters,
            sponsor,
            fulfillFunctionId
        );
    }

    /// @notice Called by the Airnode using the sponsor wallet to fulfill the
    /// request
    /// @dev Airnodes attest to controlling their respective sponsor wallets by
    /// signing a message with the address of the sponsor wallet. A timestamp
    /// is added to this signature for it to act as an expiring token if the
    /// requester contract checks for freshness.
    /// This will not revert depending on the external call. However, it will
    /// return `false` if the external call reverts or if there is no function
    /// with a matching signature at `fulfillAddress`. On the other hand, it
    /// will return `true` if the external call returns successfully or if
    /// there is no contract deployed at `fulfillAddress`.
    /// If `callSuccess` is `false`, `callData` can be decoded to retrieve the
    /// revert string.
    /// This function emits its event after an untrusted low-level call,
    /// meaning that the log indices of these events may be off.
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param requester Requester address
    /// @param fulfillFunctionId Selector of the function to be called for
    /// fulfillment
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data, encoded in contract ABI
    /// @param signature Request ID, a timestamp and the sponsor wallet address
    /// signed by the Airnode wallet
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillRequest(
        bytes32 requestId,
        address airnode,
        address requester,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        require(
            keccak256(
                abi.encodePacked(airnode, requester, fulfillFunctionId)
            ) == requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        require(
            (
                keccak256(abi.encodePacked(requestId, timestamp, msg.sender))
                    .toEthSignedMessageHash()
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
            emit FulfilledRequest(airnode, requestId, timestamp, data);
        } else {
            // We do not bubble up the revert string from `callData`
            emit FailedRequest(
                airnode,
                requestId,
                timestamp,
                "Fulfillment failed unexpectedly"
            );
        }
    }

    /// @notice Called by the Airnode using the sponsor wallet if the request
    /// cannot be fulfilled
    /// @dev The Airnode should fall back to this if a request cannot be
    /// fulfilled because of an error, including the static call to `fulfill()`
    /// returning `false` for `callSuccess`.
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param requester Requester address
    /// @param fulfillFunctionId Selector of the function to be called for
    /// fulfillment
    /// @param timestamp Timestamp used in the signature
    /// @param errorMessage A message that explains why the request has failed
    /// @param signature Request ID, a timestamp and the sponsor wallet address
    /// signed by the Airnode address
    function failRequest(
        bytes32 requestId,
        address airnode,
        address requester,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        string calldata errorMessage,
        bytes calldata signature
    ) external override {
        require(
            keccak256(
                abi.encodePacked(airnode, requester, fulfillFunctionId)
            ) == requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        require(
            (
                keccak256(abi.encodePacked(requestId, timestamp, msg.sender))
                    .toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
        delete requestIdToFulfillmentParameters[requestId];
        emit FailedRequest(airnode, requestId, timestamp, errorMessage);
    }

    /// @notice Called by the requester to make a request to be fulfilled by a
    /// relayer
    /// @dev The relayer address indexed in the relayed protocol logs because
    /// it will be the relayer that will be listening to these logs
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param relayer Relayer address
    /// @param sponsor Sponsor address
    /// @param fulfillFunctionId Selector of the function to be called for
    /// fulfillment
    /// @return requestId Request ID
    function makeRequestRelayed(
        address airnode,
        bytes32 templateId,
        bytes calldata parameters,
        address relayer,
        address sponsor,
        bytes4 fulfillFunctionId
    ) external override returns (bytes32 requestId) {
        require(airnode != address(0), "Airnode address zero");
        require(templateId != bytes32(0), "Template ID zero");
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        require(relayer != address(0), "Relayer address zero");
        require(sponsor != address(0), "Sponsor address zero");
        require(fulfillFunctionId != bytes4(0), "Fulfill function ID zero");
        uint256 requesterRequestCount = ++requesterToRequestCount[msg.sender];
        requestId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                requesterRequestCount,
                airnode,
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
            requesterRequestCount,
            templateId,
            parameters,
            sponsor,
            fulfillFunctionId
        );
    }

    /// @notice Called by the relayer using the sponsor wallet to fulfill the
    /// request with the Airnode-signed response
    /// @dev The Airnode must verify the integrity of the request details,
    /// template details, sponsor address–sponsor wallet address consistency
    /// before signing the response
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

    /// @notice Called by the relayer using the sponsor wallet if the request
    /// cannot be fulfilled
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

    /// @notice Returns if the request with the ID is made but not
    /// fulfilled/failed yet
    /// @dev If a requester has made a request, received a request ID but did
    /// not hear back, it can call this method to check if the Airnode/relayer
    /// called back `failRequest()`/`failRequestRelayed()` instead.
    /// @param requestId Request ID
    /// @return If the request is awaiting fulfillment
    function requestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        override
        returns (bool)
    {
        return requestIdToFulfillmentParameters[requestId] != bytes32(0);
    }
}
