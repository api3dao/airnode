// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../interfaces/IAirnodeRrp.sol";
import "./interfaces/ISelfAuthorizer.sol";

/// @title Authorizer contract where each Airnode is their own admin
/// @notice This contract is for when the Airnode admin will manage access
/// personally. The Airnode admin can also appoint admins (either wallets or
/// contracts) to extend whitelistings up to a limited length. The admins
/// cannot revoke whitelistings, but the Airnode admin can.
contract SelfAuthorizer is ISelfAuthorizer {
    struct Admin {
        bool status;
        uint256 maxWhitelistExtension;
        }

    IAirnodeRrp public airnodeRrp;
    uint256 public immutable authorizerType = 2;
    mapping(bytes32 => mapping(address => Admin)) public airnodeIdToAdmins;
    mapping(bytes32 => mapping(address => uint256)) public airnodeIdToClientAddressToWhitelistExpiration;
    mapping(bytes32 => mapping(uint256 => uint256)) public airnodeIdToRequesterIndexToWhitelistExpiration;

    /// @dev Reverts if the caller is not the Airnode admin
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    modifier onlyAirnodeAdmin(bytes32 airnodeId)
    {
        (address airnodeAdmin, , ) = airnodeRrp.getAirnodeParameters(airnodeId);
        require(
            msg.sender == airnodeAdmin,
            "Caller is not Airnode admin"
            );
        _;
    }

    /// @dev Reverts if the caller is not an admin
    modifier onlyAdmin(bytes32 airnodeId)
    {
        require(
            airnodeIdToAdmins[airnodeId][msg.sender].status,
            "Caller is not an admin"
            );
        _;
    }

    /// @dev Reverts if `whitelistExpiration` is not in the future or is too
    /// far in the future
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param whitelistExpiration Timestamp at which the whitelisting will
    /// expire
    modifier onlyValidExpiration(
        bytes32 airnodeId,
        uint256 whitelistExpiration
        )
    {
        require(
            whitelistExpiration >= block.timestamp,
            "Expiration is in past"
            );
        require(
            whitelistExpiration <= block.timestamp + airnodeIdToAdmins[airnodeId][msg.sender].maxWhitelistExtension,
            "Expiration exceeds admin limit"
            );
        _;
    }

    /// @param _airnodeRrp Airnode RRP contract address
    constructor (address _airnodeRrp)
    {
        airnodeRrp = IAirnodeRrp(_airnodeRrp);
    }

    /// @notice Called by the Airnode admin to set the adminship parameters
    /// of an address
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param adminAddress Address whose adminship parameters will be set
    /// @param status Adminship status
    /// @param maxWhitelistExtension Amount that the respective admin can
    /// extend the whitelistings for
    function setAdminParameters(
        bytes32 airnodeId,
        address adminAddress,
        bool status,
        uint256 maxWhitelistExtension
        )
        external
        override
        onlyAirnodeAdmin(airnodeId)
    {
        airnodeIdToAdmins[airnodeId][adminAddress] = Admin(
            status,
            maxWhitelistExtension
            );
        emit AdminParametersSet(
            airnodeId,
            adminAddress,
            status,
            maxWhitelistExtension
            );
    }

    /// @notice Called by the admin to renounce their adminship
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    function renounceAdminship(bytes32 airnodeId)
        external
        override
        onlyAdmin(airnodeId)
    {
        airnodeIdToAdmins[airnodeId][msg.sender].status = false;
        emit AdminshipRenounced(
            airnodeId,
            msg.sender
            );
    }

    /// @notice Called by the admin to extend the whitelisting of a client
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param clientAddress Client address
    /// @param whitelistExpiration Timestamp at which the whitelisting of the
    /// client will expire
    function extendClientWhitelisting(
        bytes32 airnodeId,
        address clientAddress,
        uint256 whitelistExpiration
        )
        external
        override
        onlyAdmin(airnodeId)
        onlyValidExpiration(
            airnodeId,
            whitelistExpiration
            )
    {
        require(
            whitelistExpiration > airnodeIdToClientAddressToWhitelistExpiration[airnodeId][clientAddress],
            "Expiration does not extend"
            );
        airnodeIdToClientAddressToWhitelistExpiration[airnodeId][clientAddress] = whitelistExpiration;
        emit ClientWhitelistingExtended(
            airnodeId,
            clientAddress,
            whitelistExpiration,
            msg.sender
            );
    }

    /// @notice Called by the admin to extend the whitelisting of a requester
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param requesterIndex Requester index from `RequesterStore.sol`
    /// @param whitelistExpiration Timestamp at which the whitelisting of the
    /// requester will expire
    function extendRequesterWhitelisting(
        bytes32 airnodeId,
        uint256 requesterIndex,
        uint256 whitelistExpiration
        )
        external
        override
        onlyAdmin(airnodeId)
        onlyValidExpiration(
            airnodeId,
            whitelistExpiration
            )
    {
        require(
            whitelistExpiration > airnodeIdToRequesterIndexToWhitelistExpiration[airnodeId][requesterIndex],
            "Expiration does not extend"
            );
        airnodeIdToRequesterIndexToWhitelistExpiration[airnodeId][requesterIndex] = whitelistExpiration;
        emit RequesterWhitelistingExtended(
            airnodeId,
            requesterIndex,
            whitelistExpiration,
            msg.sender
            );
    }

    /// @notice Called by the Airnode admin to set the whitelisting expiration
    /// time of the client
    /// @dev Note that the Airnode admin can use this method to set the
    /// client's `whitelistExpiration` to `0`, effectively blacklisting them
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param clientAddress Client address
    /// @param whitelistExpiration Timestamp at which the whitelisting of the
    /// client will expire
    function setClientWhitelistExpiration(
        bytes32 airnodeId,
        address clientAddress,
        uint256 whitelistExpiration
        )
        external
        override
        onlyAirnodeAdmin(airnodeId)
    {
        airnodeIdToClientAddressToWhitelistExpiration[airnodeId][clientAddress] = whitelistExpiration;
        emit ClientWhitelistExpirationSet(
            airnodeId,
            clientAddress,
            whitelistExpiration
            );
    }

    /// @notice Called by the Airnode admin to set the whitelisting expiration
    /// time of the requester
    /// @dev Note that the Airnode admin can use this method to set the
    /// requester's `whitelistExpiration` to `0`, effectively blacklisting them
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param requesterIndex Requester index from `RequesterStore.sol`
    /// @param whitelistExpiration Timestamp at which the whitelisting of the
    /// requester will expire
    function setRequesterWhitelistExpiration(
        bytes32 airnodeId,
        uint256 requesterIndex,
        uint256 whitelistExpiration
        )
        external
        override
        onlyAirnodeAdmin(airnodeId)
    {
        airnodeIdToRequesterIndexToWhitelistExpiration[airnodeId][requesterIndex] = whitelistExpiration;
        emit RequesterWhitelistExpirationSet(
            airnodeId,
            requesterIndex,
            whitelistExpiration
            );
    }

    /// @notice Verifies the authorization status of a request
    /// @dev This method has redundant arguments because all authorizer
    /// contracts have to have the same interface and potential authorizer
    /// contracts may require to access the arguments that are redundant here.
    /// Note that we are also validating that the `designatedWallet` balance is
    /// not `0`. The ideal condition to check would be if the
    /// `designatedWallet` has enough funds to fulfill the request. However,
    /// that is not a condition that can be checked deterministically.
    /// @param requestId Request ID
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param endpointId Endpoint ID
    /// @param requesterIndex Requester index from `RequesterStore.sol`
    /// @param designatedWallet Designated wallet
    /// @param clientAddress Client address
    /// @return status Authorization status of the request
    function checkIfAuthorized(
        bytes32 requestId,        // solhint-disable-line
        bytes32 airnodeId,
        bytes32 endpointId,       // solhint-disable-line
        uint256 requesterIndex,
        address designatedWallet,
        address clientAddress
        )
        external
        view
        override
        returns (bool status)
    {
        return designatedWallet.balance != 0
            && (airnodeIdToClientAddressToWhitelistExpiration[airnodeId][clientAddress] > block.timestamp
            || airnodeIdToRequesterIndexToWhitelistExpiration[airnodeId][requesterIndex] > block.timestamp);
    }
}
