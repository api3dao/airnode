// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "./utils/WithdrawalUtils.sol";
import "./interfaces/IAirnodeProtocol.sol";

/// @title Airnode request–response protocol (RRP) and publish–subscribe
/// protocol (PSP)
/// @notice This contract is used by requester contracts to request services
/// from Airnodes and Airnodes to fulfill these requests
/// @dev This contract inherits Multicall for Airnodes to be able to make batch
/// static calls to read the contract state
contract AirnodeProtocol is Multicall, WithdrawalUtils, IAirnodeProtocol {
    using ECDSA for bytes32;

    struct Template {
        address airnode;
        bytes32 endpointId;
        bytes parameters;
    }

    struct Subscription {
        bytes32 requestHash;
        bytes32 templateId;
        bytes parameters;
        address sponsor;
        address requester;
    }

    /// @notice Maximum parameter length for templates, requests and
    /// subscriptions
    uint256 public constant override MAXIMUM_PARAMETER_LENGTH = 4096;

    /// @notice Called to get the sponsorship status for a sponsor–requester
    /// pair
    mapping(address => mapping(address => bool))
        public
        override sponsorToRequesterToSponsorshipStatus;

    /// @notice Template with the ID
    /// @dev Templates and subscriptions are stored in storage in addition to
    /// logs to ensure their persistance. Requests are only stored in logs
    /// because they are inherently short-lived.
    mapping(bytes32 => Template) public override templates;

    /// @notice Subscription with the ID
    mapping(bytes32 => Subscription) public subscriptions;

    /// @notice Called to get the request count of the requester plus one
    /// @dev This can be used to calculate the ID of the next request that the
    /// requester will make
    mapping(address => uint256) public override requesterToRequestCountPlusOne;

    mapping(bytes32 => bytes32) private requestIdToFulfillmentParameters;

    /// @notice Called by the sponsor to set the sponsorship status of a
    /// requester, i.e., allow or disallow a requester to make requests that
    /// will be fulfilled by the sponsor wallet
    /// @dev This is not Airnode-specific, i.e., the sponsor allows the
    /// requester's requests to be fulfilled through its sponsor wallets across
    /// all Airnodes
    /// @param requester Requester address
    /// @param sponsorshipStatus Sponsorship status
    function setSponsorshipStatus(address requester, bool sponsorshipStatus)
        external
        override
    {
        require(requester != address(0), "Requester address zero");
        // Initialize the requester request count for consistent request gas
        // cost
        if (requesterToRequestCountPlusOne[requester] == 0) {
            requesterToRequestCountPlusOne[requester] = 1;
        }
        sponsorToRequesterToSponsorshipStatus[msg.sender][
            requester
        ] = sponsorshipStatus;
        emit SetSponsorshipStatus(msg.sender, requester, sponsorshipStatus);
    }

    /// @notice Creates a template record
    /// @dev Templates fully or partially define requests. By referencing a
    /// template, requesters can omit specifying the "boilerplate" sections of
    /// requests.
    /// Template, subscription and request IDs are hashes of their parameters.
    /// This means:
    /// (1) You can compute their expected IDs without creating them.
    /// (2) After querying their parameters with the respective ID, you can
    /// verify the integrity of the returned data by checking if they match the
    /// ID.
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID (allowed to be `bytes32(0)`)
    /// @param parameters Template parameters
    /// @return templateId Template ID
    function createTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external override returns (bytes32 templateId) {
        require(airnode != address(0), "Airnode address zero");
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        templateId = keccak256(
            abi.encodePacked(airnode, endpointId, parameters)
        );
        if (templates[templateId].airnode == address(0)) {
            templates[templateId] = Template({
                airnode: airnode,
                endpointId: endpointId,
                parameters: parameters
            });
            emit CreatedTemplate(templateId, airnode, endpointId, parameters);
        }
    }

    /// @notice Creates a subscription record
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the subscription in addition
    /// to the parameters in the request template
    /// @param sponsor Sponsor address
    /// @param requester Requester address
    /// @return subscriptionId Subscription ID
    function createSubscription(
        bytes32 templateId,
        bytes calldata parameters,
        address sponsor,
        address requester
    ) external override returns (bytes32 subscriptionId) {
        require(
            templates[templateId].airnode != address(0),
            "Template does not exist"
        );
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        require(sponsor != address(0), "Sponsor address zero");
        require(requester != address(0), "Requester address zero");
        // Pre-compute the request hash and add it as a field to the
        // subscription so that it can be checked without having to read
        // `parameters` from storage
        bytes32 requestHash = keccak256(
            abi.encodePacked(templateId, parameters)
        );
        subscriptionId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                requestHash,
                templateId,
                parameters,
                sponsor,
                requester
            )
        );
        if (subscriptions[subscriptionId].templateId == bytes32(0)) {
            subscriptions[subscriptionId] = Subscription({
                requestHash: requestHash,
                templateId: templateId,
                parameters: parameters,
                sponsor: sponsor,
                requester: requester
            });
            emit CreatedSubscription(
                subscriptionId,
                requestHash,
                templateId,
                parameters,
                sponsor,
                requester
            );
        }
    }

    /// @notice Called by the requester to make a request
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param sponsor Sponsor address
    /// @return requestId Request ID
    function makeRequest(
        bytes32 templateId,
        bytes calldata parameters,
        address sponsor
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
                sponsor
            )
        );
        requestIdToFulfillmentParameters[requestId] = keccak256(
            abi.encodePacked(airnode, msg.sender)
        );
        emit MadeRequest(
            airnode,
            requestId,
            msg.sender,
            requesterToRequestCountPlusOne[msg.sender]++,
            templateId,
            parameters,
            sponsor
        );
    }

    /// @notice Called by the Airnode to fulfill the request
    /// @dev The data is ABI-encoded as a `bytes` type, with its format
    /// depending on the request specifications.
    /// Airnodes attest to controlling their respective sponsor wallets by
    /// signing a message with the address of the sponsor wallet. A timestamp
    /// is added to this signature so it acts like an expiring token if the
    /// requester contract checks for freshness.
    /// This will not revert depending on the external call. However, it will
    /// return `false` if the external call reverts or if there is no function
    /// with a matching signature at `fulfillAddress`. On the other hand, it
    /// will return `true` if the external call returns successfully or if
    /// there is no contract deployed at `fulfillAddress`.
    /// If `callSuccess` is `false`, `callData` can be decoded to retrieve the
    /// revert string.
    /// This function emits its event after an untrusted low-level call,
    /// meaning that the order of these events within the transaction should
    /// not be taken seriously, yet the content will be sound.
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param requester Requester address
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data
    /// @param signature Request ID, a timestamp and the sponsor wallet address
    /// signed by the Airnode address
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillRequest(
        bytes32 requestId,
        address airnode,
        address requester,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        require(
            keccak256(abi.encodePacked(airnode, requester)) ==
                requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        require(
            (
                keccak256(abi.encodePacked(requestId, msg.sender, timestamp))
                    .toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
        delete requestIdToFulfillmentParameters[requestId];
        (callSuccess, callData) = requester.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSignature(
                "fulfillRrp(bytes32,uint256,bytes)",
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

    /// @notice Called by the Airnode if the request cannot be fulfilled
    /// @dev The Airnode should fall back to this if a request cannot be
    /// fulfilled because of an error, including the static call to `fulfill()`
    /// returning `false` for `callSuccess`.
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param requester Requester address
    /// @param timestamp Timestamp used in the signature
    /// @param errorMessage A message that explains why the request has failed
    /// @param signature Request ID, a timestamp and the sponsor wallet address
    /// signed by the Airnode address
    function failRequest(
        bytes32 requestId,
        address airnode,
        address requester,
        uint256 timestamp,
        string calldata errorMessage,
        bytes calldata signature
    ) external override {
        require(
            keccak256(abi.encodePacked(airnode, requester)) ==
                requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        require(
            (
                keccak256(abi.encodePacked(requestId, msg.sender, timestamp))
                    .toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
        delete requestIdToFulfillmentParameters[requestId];
        emit FailedRequest(airnode, requestId, timestamp, errorMessage);
    }

    /// @notice Called by the Airnode to fulfill the subscription
    /// @dev The data is ABI-encoded as a `bytes` type, with its format
    /// depending on the request specifications.
    /// The conditions under which a subscription should be fulfilled are
    /// specified in its parameters, and the subscription will be fulfilled
    /// continually as long as these conditions are met. In other words, a
    /// subscription does not necessarily expire when this function is called.
    /// The Airnode will only call this function if the subsequent static call
    /// returns `true` for `callSuccess`. If it does not in this static call or
    /// the transaction following that, this will not be handled by the
    /// Airnode in any way.
    /// This function emits its event after an untrusted low-level call,
    /// meaning that the order of these events within the transaction should
    /// not be taken seriously, yet the content will be sound.
    /// @param subscriptionId Subscription ID
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data
    /// @param signature Subscription ID, a timestamp and the sponsor wallet
    /// address signed by the Airnode address
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillSubscription(
        bytes32 subscriptionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        Subscription storage subscription = subscriptions[subscriptionId];
        address airnode = templates[subscription.templateId].airnode;
        require(airnode != address(0), "Subscription does not exist");
        address requester = subscription.requester;
        require(
            requester == subscription.sponsor ||
                sponsorToRequesterToSponsorshipStatus[subscription.sponsor][
                    requester
                ],
            "Requester not sponsored"
        );
        require(
            (
                keccak256(
                    abi.encodePacked(subscriptionId, msg.sender, timestamp)
                ).toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
        (callSuccess, callData) = requester.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSignature(
                "fulfillPsp(bytes32,uint256,bytes)",
                subscriptionId,
                timestamp,
                data
            )
        );
        if (callSuccess) {
            emit FulfilledSubscription(
                airnode,
                subscriptionId,
                timestamp,
                data
            );
        }
    }

    /// @notice Called to verify the fulfillment data associated with a
    /// request, reverts if it fails
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data
    /// @param signature Request hash and fulfillment data signed by the
    /// Airnode address
    function verifyData(
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

    /// @notice Called to check if the request with the ID is made but not
    /// fulfilled/failed yet
    /// @dev If a requester has made a request, received a request ID but did
    /// not hear back, it can call this method to check if the Airnode has
    /// called back `fail()` instead.
    /// @param requestId Request ID
    /// @return If the request is awaiting fulfillment (i.e., `true` if
    /// `fulfill()` or `fail()` is not called back yet, `false` otherwise)
    function requestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        override
        returns (bool)
    {
        return requestIdToFulfillmentParameters[requestId] != bytes32(0);
    }
}
