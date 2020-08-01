// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./ChainApiClient.sol";


/// @title An example ChainAPI client contract
contract ExampleChainApiClient is ChainApiClient {
    bytes32 public data;
    bytes32 public requestId;
    uint256 public errorCode;


    /// @dev ChainApi address and endorser IDs are set at deployment
    /// @param _chainApi ChainApi contract address
    /// @param _requesterId Endorser ID from RequestStore
    constructor (
        address _chainApi,
        bytes32 _requesterId
        )
        public
        ChainApiClient(_chainApi, _requesterId)
    {}

    /// @notice Called to make a regular request to the ChainAPI contract
    /// @param templateId Template ID from TemplateStore
    /// @param parameters Dynamic request parameters (i.e., parameters that are
    /// determined at runtime, unlike the static parameters stored in the
    /// template)
    function request(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
    {
        requestId = chainApi.makeRequest(
            templateId,
            address(this),
            address(this),
            this.fulfill.selector,
            this.error.selector,
            parameters
            );
    }

    /// @notice Called by the provider wallet through the ChainAPI contract to
    /// deliver the response
    /// @param _requestId Request ID
    /// @param _data Data returned by the provider
    function fulfill(
        bytes32 _requestId,
        bytes32 _data
        )
        external
        onlyChainApi()
    {
        require(
            _requestId == requestId,
            "Example request ID check"
            );
        data = _data;
    }

    /// @notice Called by the provider wallet through the ChainAPI contract if
    /// the fulfillment has failed
    /// @param _requestId Request ID
    /// @param _errorCode Error code
    function error(
        bytes32 _requestId,
        uint256 _errorCode
        )
        external
        onlyChainApi()
    {
        require(
            _requestId == requestId,
            "Example request ID check"
            );
        errorCode = _errorCode;
    }
}
