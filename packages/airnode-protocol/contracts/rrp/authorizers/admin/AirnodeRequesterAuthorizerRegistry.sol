// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAirnodeRequesterAuthorizerRegistry.sol";

/// @title AirnodeRequesterAuthorizerRegistry
/// @notice The registry of RequesterAuthorizersWithManager contracts across different chains
/// This owner of the registry is expected to be an address managed by the DAO
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
