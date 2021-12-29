// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "./access-control-registry/RoleDeriver.sol";
import "./access-control-registry/AccessControlRegistryUser.sol";
import "./utils/WithdrawalUtils.sol";
import "./interfaces/IAirnodeProtocol.sol";

/// @title Airnode request–response protocol (RRP) and publish–subscribe
/// protocol (PSP)
/// @notice This contract is used by requester contracts to request services
/// from Airnodes and Airnodes to fulfill these requests
/// @dev This contract inherits Multicall for Airnodes to be able to make batch
/// static calls to read the contract state without requiring an external
/// dependency in the form of a separate contract deployment.
/// Template, subscription and request IDs are hashes of their parameters. This
/// means:
/// (1) You can compute their expected IDs without creating them.
/// (2) After querying their parameters with the respective ID, you can verify
/// the integrity of the returned data by checking if they match the ID.
/// Templates and subscriptions are stored in storage in addition to logs to
/// ensure their persistance. Requests are only stored in logs because they
/// are inherently short-lived.
contract AirnodeProtocol is
    Multicall,
    RoleDeriver,
    AccessControlRegistryUser,
    WithdrawalUtils,
    IAirnodeProtocol
{
    using ECDSA for bytes32;

    struct Template {
        address airnode;
        bytes32 endpointId;
        bytes parameters;
    }

    struct Subscription {
        bytes32 templateId;
        address reporter;
        address sponsor;
        address fulfillAddress;
        bytes4 fulfillFunctionId;
        bytes parameters;
    }

    /// @notice Maximum parameter length for templates, requests and
    /// subscriptions
    uint256 public constant override MAXIMUM_PARAMETER_LENGTH = 1024;

    /// @notice Description hash of the sponsored requester role
    string public constant override SPONSORED_REQUESTER_ROLE_DESCRIPTION =
        "Sponsored requester";

    bytes32 private constant SPONSORED_REQUESTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(SPONSORED_REQUESTER_ROLE_DESCRIPTION));

    /// @notice Template with the ID
    mapping(bytes32 => Template) public override templates;

    /// @notice Subscription with the ID
    mapping(bytes32 => Subscription) public subscriptions;

    /// @notice Request count of the requester
    /// @dev This can be used to calculate the ID of the next request that the
    /// requester will make
    mapping(address => uint256) public override requesterToRequestCount;

    mapping(bytes32 => bytes32) private requestIdToFulfillmentParameters;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    constructor(address _accessControlRegistry)
        AccessControlRegistryUser(_accessControlRegistry)
    {}

    /// @notice Creates a template record
    /// @dev Templates fully or partially define requests. By referencing a
    /// template, requesters can omit specifying the "boilerplate" sections of
    /// requests.
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
    /// @param reporter Reporter address
    /// @param sponsor Sponsor address
    /// @param fulfillAddress Fulfill address
    /// @param fulfillFunctionId Fulfill function ID
    /// @param parameters Parameters provided by the subscription in addition
    /// to the parameters in the request template
    /// @return subscriptionId Subscription ID
    function createSubscription(
        bytes32 templateId,
        address reporter,
        address sponsor,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external override returns (bytes32 subscriptionId) {
        require(
            templates[templateId].airnode != address(0),
            "Template does not exist"
        );
        require(
            fulfillAddress != address(this),
            "Fulfill address AirnodeProtocol"
        );
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        subscriptionId = keccak256(
            abi.encodePacked(
                templateId,
                reporter,
                sponsor,
                fulfillAddress,
                fulfillFunctionId,
                parameters
            )
        );
        if (subscriptions[subscriptionId].templateId == bytes32(0)) {
            subscriptions[subscriptionId] = Subscription({
                templateId: templateId,
                reporter: reporter,
                sponsor: sponsor,
                fulfillAddress: fulfillAddress,
                fulfillFunctionId: fulfillFunctionId,
                parameters: parameters
            });
            emit CreatedSubscription(
                subscriptionId,
                templateId,
                reporter,
                sponsor,
                fulfillAddress,
                fulfillFunctionId,
                parameters
            );
        }
    }

    /// @notice Called by the requester to make a request
    /// @dev The response is requested to be signed by the Airnode referenced
    /// in the template. The response is requested to be fulfilled by the
    /// reporter using the sponsor wallet designated for the sponsor. In other
    /// words, if `templates[templateId].airnode == reporter`, the Airnode
    /// operated by the data source will post the reponse to the blockchain.
    /// However, this is not a necessity, i.e., the requester may request the
    /// data to be signed by the data source Airnode, to be delivered by
    /// another party.
    /// The first request a requester will make will cost slightly higher gas
    /// than the rest due to how the request counter is implemented.
    /// @param templateId Template ID
    /// @param reporter Reporter address
    /// @param sponsor Sponsor address
    /// @param sponsorWallet Sponsor wallet that is requested to fulfill the
    /// request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @return requestId Request ID
    function makeRequest(
        bytes32 templateId,
        address reporter,
        address sponsor,
        address sponsorWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external override returns (bytes32 requestId) {
        address airnode = templates[templateId].airnode;
        require(airnode != address(0), "Template does not exist");
        require(
            fulfillAddress != address(this),
            "Fulfill address AirnodeProtocol"
        );
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        require(
            requesterIsSponsoredOrIsSponsor(sponsor, msg.sender),
            "Requester not sponsored"
        );
        requestId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                ++requesterToRequestCount[msg.sender],
                templateId,
                reporter,
                sponsor,
                sponsorWallet,
                fulfillAddress,
                fulfillFunctionId,
                parameters
            )
        );
        requestIdToFulfillmentParameters[requestId] = keccak256(
            abi.encodePacked(
                airnode,
                reporter,
                sponsorWallet,
                fulfillAddress,
                fulfillFunctionId
            )
        );
        emit MadeRequest(
            reporter,
            requestId,
            requesterToRequestCount[msg.sender],
            block.chainid,
            msg.sender,
            templateId,
            sponsor,
            sponsorWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
    }

    /// @notice Called by the reporter to fulfill the request
    /// @dev The data is ABI-encoded as a `bytes` type, with its format
    /// depending on the request specifications.
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
    /// @param reporter Reporter address
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param data Fulfillment data
    /// @param signature Request ID and fulfillment data signed by the Airnode
    /// address
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillRequest(
        bytes32 requestId,
        address airnode,
        address reporter,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        require(
            keccak256(
                abi.encodePacked(
                    airnode,
                    reporter,
                    msg.sender,
                    fulfillAddress,
                    fulfillFunctionId
                )
            ) == requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        require(
            (
                keccak256(abi.encodePacked(requestId, data))
                    .toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Invalid signature"
        );
        delete requestIdToFulfillmentParameters[requestId];
        (callSuccess, callData) = fulfillAddress.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSelector(fulfillFunctionId, requestId, data)
        );
        if (callSuccess) {
            emit FulfilledRequest(reporter, requestId, data);
        } else {
            // We do not bubble up the revert string from `callData`
            emit FailedRequest(
                reporter,
                requestId,
                "Fulfillment failed unexpectedly"
            );
        }
    }

    /// @notice Called by the reporter if the request cannot be fulfilled
    /// @dev The reporter should fall back to this if a request cannot be
    /// fulfilled because of an error, including the static call to `fulfill()`
    /// returning `false` for `callSuccess`.
    /// The requester must trust the reporter with only calling this in case of
    /// an error and that the error message is true. In other words, even
    /// though the reporter cannot tamper with the fulfillment data because of
    /// the signature, they may falsely report that the request has failed.
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param reporter Reporter address
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param errorMessage A message that explains why the request has failed
    function failRequest(
        bytes32 requestId,
        address airnode,
        address reporter,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        string calldata errorMessage
    ) external override {
        require(
            keccak256(
                abi.encodePacked(
                    airnode,
                    reporter,
                    msg.sender,
                    fulfillAddress,
                    fulfillFunctionId
                )
            ) == requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        delete requestIdToFulfillmentParameters[requestId];
        emit FailedRequest(reporter, requestId, errorMessage);
    }

    /// @notice Called by the reporter to fulfill the subscription
    /// @dev The data is ABI-encoded as a `bytes` type, with its format
    /// depending on the request specifications.
    /// The conditions under which a subscription should be fulfilled are
    /// specified in its parameters, and the subscription will be fulfilled
    /// continually as long as these conditions are met. In other words, a
    /// subscription does not necessarily expire when this function is called.
    /// The reporter will only call this function if the subsequent static call
    /// returns `true` for `callSuccess`. If it does not in this static call or
    /// the transaction following that, this will not be handled by the
    /// reporter in any way.
    /// This function emits its event after an untrusted low-level call,
    /// meaning that the order of these events within the transaction should
    /// not be taken seriously, yet the content will be sound.
    /// @param subscriptionId Subcription ID
    /// @param data Fulfillment data
    /// @param signature Request ID and fulfillment data signed by the Airnode
    /// address
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillSubscription(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        Subscription storage subscription = subscriptions[subscriptionId];
        bytes32 templateId = subscription.templateId;
        require(templateId != bytes32(0), "Subscription does not exist");
        require(
            (
                keccak256(abi.encodePacked(subscriptionId, data))
                    .toEthSignedMessageHash()
            ).recover(signature) == templates[templateId].airnode,
            "Invalid signature"
        );
        (callSuccess, callData) = subscription.fulfillAddress.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSelector(
                subscription.fulfillFunctionId,
                subscriptionId,
                data
            )
        );
        if (callSuccess) {
            emit FulfilledSubscription(subscriptionId, data);
        }
    }

    /// @notice Called to check if the requester is sponsored by the sponsor or
    /// is the sponsor
    /// @param sponsor Sponsor address
    /// @param requester Requester address
    /// @return If requester is sponsored by the sponsor or is the sponsor
    function requesterIsSponsoredOrIsSponsor(address sponsor, address requester)
        public
        view
        override
        returns (bool)
    {
        return
            sponsor == requester ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                deriveSponsoredRequesterRole(sponsor),
                requester
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

    /// @notice Called to get the sponsored requester role for a specific
    /// sponsor
    /// @param sponsor Sponsor address
    /// @return sponsoredRequesterRole Sponsored requester role
    function deriveSponsoredRequesterRole(address sponsor)
        public
        pure
        override
        returns (bytes32 sponsoredRequesterRole)
    {
        sponsoredRequesterRole = _deriveRole(
            _deriveRootRole(sponsor),
            SPONSORED_REQUESTER_ROLE_DESCRIPTION_HASH
        );
    }
}
