// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAirnodeRequesterAuthorizerRegistry.sol";

/// @title Contract for storing the addresses of RequesterAuthorizerWithManager
/// authorizer contracts across different chains
/// @notice Multiple contracts can refer to this contract to retrieve the
/// address of the authorizer contract they need to interact with in order to
/// whitelist a requester based on a specific action. For example lock tokens
/// or make a payment to an Airnode wallet.
contract AirnodeRequesterAuthorizerRegistry is
    Ownable,
    IAirnodeRequesterAuthorizerRegistry
{
    /// @notice mapping used to store all the RequesterAuthorizerWithManager
    /// addresses for different chains
    mapping(uint256 => address) public chainIdToRequesterAuthorizerWithManager;

    /// @notice Called by the owner to set the address of RequesterAuthorizerWithManager for different chains
    /// @param _chainId The chainId
    /// @param _requesterAuthorizerWithManager The address of the RequesterAuthorizerWithManager on the chainId
    function setRequesterAuthorizerWithManager(
        uint256 _chainId,
        address _requesterAuthorizerWithManager
    ) external override onlyOwner {
        require(_chainId != 0, "Zero chainId");
        require(_requesterAuthorizerWithManager != address(0), "Zero address");
        chainIdToRequesterAuthorizerWithManager[
            _chainId
        ] = _requesterAuthorizerWithManager;
        emit SetRequesterAuthorizerWithManager(
            _chainId,
            _requesterAuthorizerWithManager,
            msg.sender
        );
    }
}
