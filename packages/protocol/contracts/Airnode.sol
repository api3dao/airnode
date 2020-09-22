// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./interfaces/IAirnode.sol";
import "./EndpointStore.sol";
import "./TemplateStore.sol";


/// @title The contract used to make and fulfill requests
/// @notice Clients use this contract to make requests that follow a
/// request-response scheme. In addition, it inherits from contracts that keep
/// records of providers, requesters, endpoints, etc.
contract Airnode is EndpointStore, TemplateStore, IAirnode {
    mapping(bytes32 => bytes32) private requestIdToResponseParameters;
    mapping(bytes32 => bool) private requestWithIdHasFailed;
    uint256 private noRequests = 0;


    /// @notice Called by the client to make a regular request. A regular
    /// request refers to a template for the requester-agnostic parameters, but
    /// requires the client to provide the requester-specific parameters.
    /// @dev This is the recommended way of making a request in most cases. Use
    /// makeShortRequest() if gas efficiency is critical.
    /// @param templateId Template ID from TemplateStore
    /// @param requesterInd Requester index from RequesterStore
    /// @param designatedWallet Designated wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters Dynamic request parameters (i.e., parameters that are
    /// determined at runtime, unlike the static parameters stored in the
    /// template)
    /// @return requestId Request ID
    function makeRequest(
        bytes32 templateId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
        )
        external
        override
        onlyIfDesignatedWalletIsFunded(
          designatedWallet,
          providers[templates[templateId].providerId].minBalance
          )
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this,
            msg.sender
            ));
        bytes32 providerId = templates[templateId].providerId;
        requestIdToResponseParameters[requestId] = keccak256(abi.encodePacked(
            providerId,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId
            ));
        emit ClientRequestCreated(
            providerId,
            requestId,
            msg.sender,
            templateId,
            requesterInd,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
    }

    /// @notice Called by the requester to make a short request. A short
    /// request refers to a template, which the provider will use to get both
    /// requester-agnostic and requester-specific parameters
    /// @dev Use this if gas efficiency is critical
    /// @param templateId Template ID from TemplateStore
    /// @param parameters Dynamic request parameters (i.e., parameters that are
    /// determined at runtime, unlike the static parameters stored in the
    /// template)
    /// @return requestId Request ID
    function makeShortRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
        override
        onlyIfDesignatedWalletIsFunded(
          templates[templateId].designatedWallet,
          providers[templates[templateId].providerId].minBalance
          )
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this,
            msg.sender
            ));
        Template storage template = templates[templateId];
        requestIdToResponseParameters[requestId] = keccak256(abi.encodePacked(
            template.providerId,
            template.designatedWallet,
            template.fulfillAddress,
            template.fulfillFunctionId
            ));
        emit ClientShortRequestCreated(
            templates[templateId].providerId,
            requestId,
            msg.sender,
            templateId,
            parameters
        );
    }

    /// @notice Called by the requester to make a full request. A full request
    /// does not refer to a template, meaning that it passes all the parameters
    /// in the request. It does not require a template to be created
    /// beforehand, which provides extra flexibility compared to makeRequest()
    /// and makeShortRequest().
    /// @dev This is the least gas efficient way of making a request. Do not
    /// use it unless you have a good reason.
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param requesterInd Requester index from RequesterStore
    /// @param designatedWallet Designated wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters All request parameters
    /// @return requestId Request ID
    function makeFullRequest(
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
        )
        external
        override
        onlyIfDesignatedWalletIsFunded(
          designatedWallet,
          providers[providerId].minBalance
          )
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this,
            msg.sender
            ));
        requestIdToResponseParameters[requestId] = keccak256(abi.encodePacked(
            providerId,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId
            ));
        emit ClientFullRequestCreated(
            providerId,
            requestId,
            msg.sender,
            endpointId,
            requesterInd,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
    }

    /// @notice Called by the oracle node to fulfill individual requests
    /// (including regular, short and full requests)
    /// @param providerId Provider ID from ProviderStore
    /// @param requestId Request ID
    /// @param statusCode Status code of the fulfillment
    /// @param data Fulfillment data
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfill(
        bytes32 providerId,
        bytes32 requestId,
        uint256 statusCode,
        bytes32 data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        override
        onlyCorrectResponseParameters(
            requestId,
            providerId,
            fulfillAddress,
            fulfillFunctionId
            )
        returns(
            bool callSuccess,
            bytes memory callData
        )
    {
        delete requestIdToResponseParameters[requestId];
        emit ClientRequestFulfilled(
            providerId,
            requestId,
            statusCode,
            data
            );
        (callSuccess, callData) = fulfillAddress.call(
            abi.encodeWithSelector(fulfillFunctionId, requestId, statusCode, data)
            );
    }

    /// @notice Called by the oracle node to fulfill individual requests
    /// (including regular, short and full requests) with a bytes type response
    /// @dev The oracle uses this method to fulfill if the requester has
    /// specifically asked for a bytes type response
    /// @param providerId Provider ID from ProviderStore
    /// @param requestId Request ID
    /// @param statusCode Status code of the fulfillment
    /// @param data Fulfillment data of type bytes
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillBytes(
        bytes32 providerId,
        bytes32 requestId,
        uint256 statusCode,
        bytes calldata data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        override
        onlyCorrectResponseParameters(
            requestId,
            providerId,
            fulfillAddress,
            fulfillFunctionId
            )
        returns(
            bool callSuccess,
            bytes memory callData
        )
    {
        delete requestIdToResponseParameters[requestId];
        emit ClientRequestFulfilledWithBytes(
            providerId,
            requestId,
            statusCode,
            data
            );
        (callSuccess, callData) = fulfillAddress.call(
            abi.encodeWithSelector(fulfillFunctionId, requestId, statusCode, data)
            );
    }

    /// @notice Called by the oracle node if a request cannot be fulfilled
    /// @dev The oracle should fall back to this if a request cannot be
    /// fulfilled because fulfill() reverts
    /// @param providerId Provider ID from ProviderStore
    /// @param requestId Request ID
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    function fail(
        bytes32 providerId,
        bytes32 requestId,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        override
        onlyCorrectResponseParameters(
            requestId,
            providerId,
            fulfillAddress,
            fulfillFunctionId
            )
    {
        delete requestIdToResponseParameters[requestId];
        // Failure is recorded so that it can be checked externally with
        // checkIfRequestHasFailed()
        requestWithIdHasFailed[requestId] = true;
        emit ClientRequestFailed(
            providerId,
            requestId
            );
    }

    /// @notice Used to check if a request has failed because it could not be
    /// fulfilled
    /// @param requestId Request ID
    /// @return status If the request has failed
    function checkIfRequestHasFailed(bytes32 requestId)
        external
        view
        returns(bool status)
    {
        status = requestWithIdHasFailed[requestId];
    }

    /// @dev Reverts unless the incoming response parameters do not match the
    /// ones provided in the request
    /// @param requestId Request ID
    /// @param providerId Provider ID from ProviderStore
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    modifier onlyCorrectResponseParameters(
        bytes32 requestId,
        bytes32 providerId,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
    {
        bytes32 incomingResponseParameters = keccak256(abi.encodePacked(
            providerId,
            msg.sender,
            fulfillAddress,
            fulfillFunctionId
            ));
        require(
            incomingResponseParameters == requestIdToResponseParameters[requestId],
            "Response parameters do not match"
            );
        _;
    }
}
