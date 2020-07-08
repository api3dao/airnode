// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/ClientInterface.sol";
import "./interfaces/ChainApiInterface.sol";


/// @title An example ChainAPI client contract
/// @notice The contract authorizes a requester to endorse it by announcing its
/// ID at endorserId
contract ExampleClient is ClientInterface {
    ChainApiInterface public chainApi;
    bytes32 public override endorserId;
    bytes32 public data;
    bytes32 public requestId;
    uint256 public errorCode;

    constructor (
        address _chainApi,
        bytes32 _endorserId
        )
        public
    {
        chainApi = ChainApiInterface(_chainApi);
        endorserId = _endorserId;
    }

    /// @notice Called to make a request to the ChainAPI contract
    /// @param providerId Provider ID
    /// @param templateId Template ID
    /// @param parameters Runtime parameters in addition to the ones defines in
    /// the template addressed by templateId
    function request(
        bytes32 providerId,
        bytes32 templateId,
        bytes calldata parameters
        )
        external
    {
        requestId = chainApi.makeRequest(
            providerId,
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

    /// @dev Reverts if the caller is not the ChainAPI contract
    modifier onlyChainApi()
    {
        require(
            msg.sender == address(chainApi),
            "Can only be called by the ChainAPI contract"
            );
        _;
    }
}
