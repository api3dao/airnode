// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "./WithdrawalUtils.sol";
import "./interfaces/IAirnode.sol";

contract Airnode is Multicall, WithdrawalUtils, IAirnode {
    using ECDSA for bytes32;

    struct Template {
        address airnode;
        bytes32 endpointId;
        bytes parameters;
    }

    mapping(bytes32 => Template) public templates;

    mapping(address => mapping(address => bool))
        public sponsorToRequesterToSponsorshipStatus;

    mapping(address => uint256) public requesterToRequestCountPlusOne;

    mapping(bytes32 => bytes32) private requestIdToFulfillmentParameters;

    function createTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external returns (bytes32 templateId) {
        require(airnode != address(0), "Airnode address zero");
        templateId = keccak256(
            abi.encodePacked(airnode, endpointId, parameters)
        );
        templates[templateId] = Template({
            airnode: airnode,
            endpointId: endpointId,
            parameters: parameters
        });
        emit CreatedTemplate(templateId, airnode, endpointId, parameters);
    }

    function setSponsorshipStatus(address requester, bool sponsorshipStatus)
        external
    {
        if (requesterToRequestCountPlusOne[requester] == 0) {
            requesterToRequestCountPlusOne[requester] = 1;
        }
        sponsorToRequesterToSponsorshipStatus[msg.sender][
            requester
        ] = sponsorshipStatus;
        emit SetSponsorshipStatus(msg.sender, requester, sponsorshipStatus);
    }

    function makeRequest(
        bytes32 templateId,
        address reporter,
        address sponsor,
        address sponsorWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 requestId) {
        require(templates[templateId].airnode != address(0), "Template does not exist");
        require(fulfillAddress != address(this), "Fulfill address AirnodeRrp");
        require(
            sponsorToRequesterToSponsorshipStatus[sponsor][msg.sender],
            "Requester not sponsored"
        );
        uint256 requesterRequestCount = requesterToRequestCountPlusOne[
            msg.sender
        ];
        requestId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                requesterRequestCount,
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
                templates[templateId].airnode,
                reporter,
                sponsorWallet,
                fulfillAddress,
                fulfillFunctionId
            )
        );
        requesterToRequestCountPlusOne[msg.sender]++;
        emit MadeRequest(
            reporter,
            requestId,
            requesterRequestCount,
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

    function fulfillRequest(
        bytes32 requestId,
        address airnode,
        address reporter,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData) {
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

    function failRequest(
        bytes32 requestId,
        address airnode,
        address reporter,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        string calldata errorMessage
    ) external {
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

    function requestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        returns (bool isAwaitingFulfillment)
    {
        isAwaitingFulfillment =
            requestIdToFulfillmentParameters[requestId] != bytes32(0);
    }

    // PSP starts here

    struct Subscription {
        bytes32 templateId;
        address reporter;
        address sponsor;
        address conditionAddress;
        bytes4 conditionFunctionId;
        address fulfillAddress;
        bytes4 fulfillFunctionId;
        bytes parameters;
    }

    mapping(bytes32 => Subscription) public subscriptions;

    function createSubscription(
        bytes32 templateId,
        address reporter,
        address sponsor,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 subscriptionId) {
        subscriptionId = keccak256(
            abi.encodePacked(
                templateId,
                reporter,
                sponsor,
                conditionAddress,
                conditionFunctionId,
                fulfillAddress,
                fulfillFunctionId,
                parameters
            )
        );
        subscriptions[subscriptionId] = Subscription({
            templateId: templateId,
            reporter: reporter,
            sponsor: sponsor,
            conditionAddress: conditionAddress,
            conditionFunctionId: conditionFunctionId,
            fulfillAddress: fulfillAddress,
            fulfillFunctionId: fulfillFunctionId,
            parameters: parameters
        });
        emit CreatedSubscription(
            subscriptionId,
            templateId,
            reporter,
            sponsor,
            conditionAddress,
            conditionFunctionId,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
    }

    function fulfillSubscription(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData) {
        Subscription storage subscription = subscriptions[subscriptionId];
        require(
            (
                keccak256(abi.encodePacked(subscriptionId, data))
                    .toEthSignedMessageHash()
            ).recover(signature) == templates[subscription.templateId].airnode,
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
}
