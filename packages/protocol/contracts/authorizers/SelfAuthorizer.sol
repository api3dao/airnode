// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../interfaces/IAirnode.sol";
import "./interfaces/ISelfAuthorizer.sol";

/// @title Authorizer contract where each provider is their own admin
/// @notice This contract is for when the provider admin will manage access
/// personally. The provider admin can also appoint admins (either wallets or
/// contracts) to extend whitelistings up to a limited length. The admins
/// cannot revoke whitelistings, but the provider admin can.
contract SelfAuthorizer is ISelfAuthorizer {
    struct Admin {
        bool status;
        uint256 maxWhitelistExtension;
        }

    IAirnode public airnode;
    uint256 public immutable authorizerType = 2;
    mapping(bytes32 => mapping(address => Admin)) public providerIdToAdmins;
    mapping(bytes32 => mapping(address => uint256)) public providerIdToClientAddressToWhitelistExpiration;
    mapping(bytes32 => mapping(uint256 => uint256)) public providerIdToRequesterIndexToWhitelistExpiration;

    /// @dev Reverts if the caller is not the provider admin
    /// @param providerId Provider ID from `ProviderStore.sol`
    modifier onlyProviderAdmin(bytes32 providerId)
    {
        (address providerAdmin, , ) = airnode.getProvider(providerId);
        require(
            msg.sender == providerAdmin,
            "Caller is not provider admin"
            );
        _;
    }

    /// @dev Reverts if the caller is not an admin
    modifier onlyAdmin(bytes32 providerId)
    {
        require(
            providerIdToAdmins[providerId][msg.sender].status,
            "Caller is not an admin"
            );
        _;
    }

    /// @dev Reverts if `whitelistExpiration` is not in the future or is too
    /// far in the future
    /// @param providerId Provider ID from `ProviderStore.sol`
    /// @param whitelistExpiration Timestamp at which the whitelisting will
    /// expire
    modifier onlyValidExpiration(
        bytes32 providerId,
        uint256 whitelistExpiration
        )
    {
        require(
            whitelistExpiration >= block.timestamp,
            "Expiration is in past"
            );
        require(
            whitelistExpiration <= block.timestamp + providerIdToAdmins[providerId][msg.sender].maxWhitelistExtension,
            "Expiration exceeds admin limit"
            );
        _;
    }

    /// @param _airnode Airnode contract address
    constructor (address _airnode)
    {
        airnode = IAirnode(_airnode);
    }

    /// @notice Called by the provider admin to set the adminship parameters
    /// of an address
    /// @param providerId Provider ID from `ProviderStore.sol`
    /// @param adminAddress Address whose adminship parameters will be set
    /// @param status Adminship status
    /// @param maxWhitelistExtension Amount that the respective admin can
    /// extend the whitelistings for
    function setAdminParameters(
        bytes32 providerId,
        address adminAddress,
        bool status,
        uint256 maxWhitelistExtension
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        providerIdToAdmins[providerId][adminAddress] = Admin(
            status,
            maxWhitelistExtension
            );
        emit AdminParametersSet(
            providerId,
            adminAddress,
            status,
            maxWhitelistExtension
            );
    }

    /// @notice Called by the admin to renounce their adminship
    /// @param providerId Provider ID from `ProviderStore.sol`
    function renounceAdminship(bytes32 providerId)
        external
        override
        onlyAdmin(providerId)
    {
        providerIdToAdmins[providerId][msg.sender].status = false;
        emit AdminshipRenounced(
            providerId,
            msg.sender
            );
    }

    /// @notice Called by the admin to extend the whitelisting of a client
    /// @param providerId Provider ID from `ProviderStore.sol`
    /// @param clientAddress Client address
    /// @param whitelistExpiration Timestamp at which the whitelisting of the
    /// client will expire
    function extendClientWhitelisting(
        bytes32 providerId,
        address clientAddress,
        uint256 whitelistExpiration
        )
        external
        override
        onlyAdmin(providerId)
        onlyValidExpiration(
            providerId,
            whitelistExpiration
            )
    {
        require(
            whitelistExpiration > providerIdToClientAddressToWhitelistExpiration[providerId][clientAddress],
            "Expiration does not extend"
            );
        providerIdToClientAddressToWhitelistExpiration[providerId][clientAddress] = whitelistExpiration;
        emit ClientWhitelistingExtended(
            providerId,
            clientAddress,
            whitelistExpiration,
            msg.sender
            );
    }

    /// @notice Called by the admin to extend the whitelisting of a requester
    /// @param providerId Provider ID from `ProviderStore.sol`
    /// @param requesterIndex Requester index from `RequesterStore.sol`
    /// @param whitelistExpiration Timestamp at which the whitelisting of the
    /// requester will expire
    function extendRequesterWhitelisting(
        bytes32 providerId,
        uint256 requesterIndex,
        uint256 whitelistExpiration
        )
        external
        override
        onlyAdmin(providerId)
        onlyValidExpiration(
            providerId,
            whitelistExpiration
            )
    {
        require(
            whitelistExpiration > providerIdToRequesterIndexToWhitelistExpiration[providerId][requesterIndex],
            "Expiration does not extend"
            );
        providerIdToRequesterIndexToWhitelistExpiration[providerId][requesterIndex] = whitelistExpiration;
        emit RequesterWhitelistingExtended(
            providerId,
            requesterIndex,
            whitelistExpiration,
            msg.sender
            );
    }

    /// @notice Called by the provider admin to set the whitelisting expiration
    /// time of the client
    /// @dev Note that the provider admin can use this method to set the
    /// client's `whitelistExpiration` to `0`, effectively blacklisting them
    /// @param providerId Provider ID from `ProviderStore.sol`
    /// @param clientAddress Client address
    /// @param whitelistExpiration Timestamp at which the whitelisting of the
    /// client will expire
    function setClientWhitelistExpiration(
        bytes32 providerId,
        address clientAddress,
        uint256 whitelistExpiration
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        providerIdToClientAddressToWhitelistExpiration[providerId][clientAddress] = whitelistExpiration;
        emit ClientWhitelistExpirationSet(
            providerId,
            clientAddress,
            whitelistExpiration
            );
    }

    /// @notice Called by the provider admin to set the whitelisting expiration
    /// time of the requester
    /// @dev Note that the provider admin can use this method to set the
    /// requester's `whitelistExpiration` to `0`, effectively blacklisting them
    /// @param providerId Provider ID from `ProviderStore.sol`
    /// @param requesterIndex Requester index from `RequesterStore.sol`
    /// @param whitelistExpiration Timestamp at which the whitelisting of the
    /// requester will expire
    function setRequesterWhitelistExpiration(
        bytes32 providerId,
        uint256 requesterIndex,
        uint256 whitelistExpiration
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        providerIdToRequesterIndexToWhitelistExpiration[providerId][requesterIndex] = whitelistExpiration;
        emit RequesterWhitelistExpirationSet(
            providerId,
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
    /// @param providerId Provider ID from `ProviderStore.sol`
    /// @param endpointId Endpoint ID
    /// @param requesterIndex Requester index from `RequesterStore.sol`
    /// @param designatedWallet Designated wallet
    /// @param clientAddress Client address
    /// @return status Authorization status of the request
    function checkIfAuthorized(
        bytes32 requestId,        // solhint-disable-line
        bytes32 providerId,
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
            && (providerIdToClientAddressToWhitelistExpiration[providerId][clientAddress] > block.timestamp
            || providerIdToRequesterIndexToWhitelistExpiration[providerId][requesterIndex] > block.timestamp);
    }
}
