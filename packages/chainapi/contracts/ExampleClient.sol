// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./Client.sol";


/// @title An example ChainAPI client contract
/// @notice The contract authorizes a requester to endorse it by announcing its
/// ID at requesterId
contract ExampleClient is Client {
    bytes32 public data;
    bytes32 public requestId;
    uint256 public errorCode;


    constructor (
        address _chainApi,
        bytes32 _requesterId
        )
        public
        Client(_chainApi, _requesterId)
    {}

    /// @notice Called to make a request to the ChainAPI contract
    /// @param templateId Template ID
    /// @param parameters Runtime parameters in addition to the ones defines in
    /// the template addressed by templateId
    function request(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
    {
        requestId = chainApi.makeRequest(
            templateId,
            address(this),
            this.fulfill.selector,
            address(this),
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
