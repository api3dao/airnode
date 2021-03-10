// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./interfaces/IMasterAuthorizer.sol";

/// @title Authorizer contract with a master admin
/// @notice This contract assumes that there is a master admin who can be
/// trusted with whitelisting clients and requesters for specific providers.
/// In the API3 context, this would be the API3 DAO. However, requiring a DAO
/// to vote on every whitelisting and blacklisting action is not scalable. As
/// a solution, the master admin (i.e., the API3 DAO) appoints addresses as
/// admins (e.g., a multisig controlled by the integrations team). These admins
/// are limited in authority; for example, they can only extend whitelistings
/// up to a limited length (specified by the master admin). Most importantly,
/// the admins cannot revoke whitelistings, as this can be used to perform a
/// denial of service attack. Note that the master admin is authorized to
/// revoke whitelistings.
/// Contracts can also be set as admins. For example, a contract can
/// automatically extend the whitelistings of clients or requesters when it
/// receives payment.
contract MasterAuthorizer is IMasterAuthorizer {
    struct Admin {
        bool status;
        uint256 maxWhitelistExtension;
        }

    uint256 public immutable authorizerType = 1;
    address public masterAdmin;
    mapping(address => Admin) public admins;
    mapping(bytes32 => mapping(address => uint256)) public
        providerIdToClientAddressToWhitelistExpiration;
    mapping(bytes32 => mapping(uint256 => uint256)) public
        providerIdToRequesterIndexToWhitelistExpiration;

    /// @dev Reverts if the caller is not the master admin
    modifier onlyMasterAdmin()
    {
        require(
            msg.sender == masterAdmin,
            "Caller is not master admin"
            );
        _;
    }

    /// @dev Reverts if the caller is not an admin
    modifier onlyAdmin()
    {
        require(
            admins[msg.sender].status,
            "Caller is not an admin"
            );
        _;
    }

    /// @dev Reverts if `whitelistExpiration` is not in the future or is too
    /// far in the future
    /// @param whitelistExpiration Timestamp at which the whitelisting will
    /// expire
    modifier onlyValidExpiration(uint256 whitelistExpiration)
    {
        require(
            whitelistExpiration >= block.timestamp,
            "Expiration is in past"
            );
        require(
            whitelistExpiration <= block.timestamp + admins[msg.sender].maxWhitelistExtension,
            "Expiration exceeds admin limit"
            );
        _;
    }

    /// @param _masterAdmin Address that will be set as the master admin
    constructor (address _masterAdmin)
    {
        masterAdmin = _masterAdmin;
    }

    /// @notice Called by the master admin to transfer the master adminship to
    /// another address
    /// @param _masterAdmin Address the master adminship will be transferred to
    function transferMasterAdminship(address _masterAdmin)
        external
        override
        onlyMasterAdmin
    {
        require(
            _masterAdmin != address(0),
            "Used zero address"
            );
        require(
            _masterAdmin != masterAdmin,
            "Input will not update state"
            );
        emit MasterAdminshipTransferred(
            masterAdmin,
            _masterAdmin
            );
        masterAdmin = _masterAdmin;
    }

    /// @notice Called by the master admin to set the adminship parameters of
    /// an address
    /// @param adminAddress Address whose adminship parameters will be set
    /// @param status Adminship status
    /// @param maxWhitelistExtension Amount that the respective admin can
    /// extend the whitelistings for
    function setAdminParameters(
        address adminAddress,
        bool status,
        uint256 maxWhitelistExtension
        )
        external
        override
        onlyMasterAdmin
    {
        admins[adminAddress] = Admin(
            status,
            maxWhitelistExtension
            );
        emit AdminParametersSet(
            adminAddress,
            status,
            maxWhitelistExtension
            );
    }

    /// @notice Called by the admin to renounce their adminship
    /// @dev To minimize the number of transactions the master admin will have
    /// to make, the contract is implemented optimistically, i.e., the admins
    /// are expected to renounce their adminship when they are supposed to. If
    /// this is not the case, the master admin can always revoke their
    /// adminship by force.
    function renounceAdminship()
        external
        override
        onlyAdmin()
    {
        admins[msg.sender].status = false;
        emit AdminshipRenounced(msg.sender);
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
        onlyAdmin()
        onlyValidExpiration(whitelistExpiration)
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
        onlyAdmin()
        onlyValidExpiration(whitelistExpiration)
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

    /// @notice Called by the master admin to set the whitelisting expiration
    /// time of the client
    /// @dev Note that the master admin can use this method to set the client's
    /// `whitelistExpiration` to `0`, effectively blacklisting them
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
        onlyMasterAdmin
    {
        providerIdToClientAddressToWhitelistExpiration[providerId][clientAddress] = whitelistExpiration;
        emit ClientWhitelistExpirationSet(
            providerId,
            clientAddress,
            whitelistExpiration
            );
    }

    /// @notice Called by the master admin to set the whitelisting expiration
    /// time of the requester
    /// @dev Note that the master admin can use this method to set the
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
        onlyMasterAdmin
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
    /// not `0`. The ideal condition to check would be if `designatedWallet`
    /// has enough funds to fulfill the request. However, that is not a
    /// condition that can be checked deterministically.
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
