// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface ChainApiInterface {
    event RequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 templateId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        address errorAddress,
        bytes4 errorFunctionId,
        bytes parameters
        );

    event FullRequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 endpointId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        address errorAddress,
        bytes4 errorFunctionId,
        bytes parameters
        );

    event ShortRequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 templateId,
        bytes parameters
        );

    event FulfillmentSuccessful(
        bytes32 indexed providerId,
        bytes32 requestId,
        bytes32 data
        );

    event FulfillmentBytesSuccessful(
        bytes32 indexed providerId,
        bytes32 requestId,
        bytes data
        );

    event FulfillmentErrored(
        bytes32 indexed providerId,
        bytes32 requestId,
        uint256 errorCode
        );

    event FulfillmentFailed(
        bytes32 indexed providerId,
        bytes32 requestId
        );


    function makeRequest(
        bytes32 templateId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        address errorAddress,
        bytes4 errorFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);

    function makeFullRequest(
        bytes32 providerId,
        bytes32 endpointId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        address errorAddress,
        bytes4 errorFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);

    function makeShortRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);

    function fulfill(
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes32 requestId,
        bytes32 data
        )
        external
        returns(
            bool callSuccess,
            bytes memory callData
        );

    function fulfillBytes(
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes32 requestId,
        bytes calldata data
        )
        external
        returns(
            bool callSuccess,
            bytes memory callData
        );

    function error(
        address errorAddress,
        bytes4 errorFunctionId,
        bytes32 requestId,
        uint256 errorCode
        )
        external
        returns(
            bool callSuccess,
            bytes memory callData
        );
    
    function fail(bytes32 requestId)
        external;
}
