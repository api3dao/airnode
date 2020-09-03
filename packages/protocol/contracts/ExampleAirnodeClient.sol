// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./AirnodeClient.sol";


/// @title An example Airnode client contract
contract ExampleAirnodeClient is AirnodeClient {
    bytes32 public data;
    bytes32 public requestId;
    uint256 public errorCode;


    /// @dev Airnode address and endorser IDs are set at deployment
    /// @param _airnode Airnode contract address
    /// @param _requesterId Endorser ID from RequestStore
    constructor (
        address _airnode,
        bytes32 _requesterId
        )
        public
        AirnodeClient(_airnode, _requesterId)
    {}

    /// @notice Called to make a regular request to the Airnode contract
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
        requestId = airnode.makeRequest(
            templateId,
            address(this),
            address(this),
            this.fulfill.selector,
            this.error.selector,
            parameters
            );
    }

    /// @notice Called by the provider wallet through the Airnode contract to
    /// deliver the response
    /// @param _requestId Request ID
    /// @param _data Data returned by the provider
    function fulfill(
        bytes32 _requestId,
        bytes32 _data
        )
        external
        onlyAirnode()
    {
        require(
            _requestId == requestId,
            "Example request ID check"
            );
        data = _data;
    }

    /// @notice Called by the provider wallet through the Airnode contract if
    /// the fulfillment has failed
    /// @param _requestId Request ID
    /// @param _errorCode Error code
    function error(
        bytes32 _requestId,
        uint256 _errorCode
        )
        external
        onlyAirnode()
    {
        require(
            _requestId == requestId,
            "Example request ID check"
            );
        errorCode = _errorCode;
    }
}
