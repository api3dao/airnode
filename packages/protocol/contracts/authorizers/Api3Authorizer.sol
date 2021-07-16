// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./interfaces/IApi3Authorizer.sol";

/// @title Authorizer contract controlled by the API3 DAO
contract Api3Authorizer is IApi3Authorizer {
    string private constant ERROR_UNAUTHORIZED = "Unauthorized";
    string private constant ERROR_ZERO_ADDRESS = "Zero address";
    string private constant ERROR_EXPIRATION_NOT_EXTENDED =
        "Expiration not extended";

    /// @dev Authorizer contracts can use `authorizerType` to signal their type
    uint256 public immutable override authorizerType = 1;
    /// @dev Meta admin sets the admin statuses of addresses and has super
    /// admin privileges
    address public metaAdmin;
    mapping(address => AdminStatus) public adminStatuses;
    mapping(bytes32 => mapping(address => uint256))
        public airnodeIdToClientAddressToWhitelistExpiration;
    mapping(bytes32 => mapping(address => bool))
        public airnodeIdToClientAddressToWhitelistStatus;

    /// @param _metaAdmin Address that will be set as the meta admin
    constructor(address _metaAdmin) {
        require(_metaAdmin != address(0), ERROR_ZERO_ADDRESS);
        metaAdmin = _metaAdmin;
    }

    /// @notice Called by the meta admin to set the meta admin
    /// @param _metaAdmin Address that will be set as the meta admin
    function setMetaAdmin(address _metaAdmin) external override {
        require(msg.sender == metaAdmin, ERROR_UNAUTHORIZED);
        require(_metaAdmin != address(0), ERROR_ZERO_ADDRESS);
        metaAdmin = _metaAdmin;
        emit SetMetaAdmin(metaAdmin);
    }

    /// @notice Called by the meta admin to set the admin status of an address
    /// @param admin Address whose admin status will be set
    /// @param status Admin status
    function setAdminStatus(address admin, AdminStatus status)
        external
        override
    {
        require(msg.sender == metaAdmin, ERROR_UNAUTHORIZED);
        adminStatuses[admin] = status;
        emit SetAdminStatus(admin, status);
    }

    /// @notice Called by an admin to renounce their admin status
    /// @dev To minimize the number of transactions the meta admin will have
    /// to make, the contract is implemented optimistically, i.e., the admins
    /// are expected to renounce their admin status when they are needed to.
    /// If this is not the case, the meta admin can always revoke their
    /// adminship.
    /// This method cannot be used by the meta admin to renounce their meta
    /// adminship.
    function renounceAdminStatus() external override {
        require(
            adminStatuses[msg.sender] > AdminStatus.Unauthorized,
            ERROR_UNAUTHORIZED
        );
        adminStatuses[msg.sender] = AdminStatus.Unauthorized;
        emit RenouncedAdminStatus(msg.sender);
    }

    /// @notice Called by an admin to extend the whitelist expiration of a
    /// client
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param clientAddress Client address
    /// @param expiration Timestamp at which the client will no longer be
    /// whitelisted
    function extendWhitelistExpiration(
        bytes32 airnodeId,
        address clientAddress,
        uint256 expiration
    ) external override {
        require(
            adminStatuses[msg.sender] >= AdminStatus.Admin ||
                msg.sender == metaAdmin,
            ERROR_UNAUTHORIZED
        );
        require(
            expiration >
                airnodeIdToClientAddressToWhitelistExpiration[airnodeId][
                    clientAddress
                ],
            ERROR_EXPIRATION_NOT_EXTENDED
        );
        airnodeIdToClientAddressToWhitelistExpiration[airnodeId][
            clientAddress
        ] = expiration;
        emit ExtendedWhitelistExpiration(
            airnodeId,
            clientAddress,
            expiration,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelisting of a client
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param clientAddress Client address
    /// @param expiration Timestamp at which the whitelisting of the client
    /// will expire
    function setWhitelistExpiration(
        bytes32 airnodeId,
        address clientAddress,
        uint256 expiration
    ) external override {
        require(
            adminStatuses[msg.sender] == AdminStatus.SuperAdmin ||
                msg.sender == metaAdmin,
            ERROR_UNAUTHORIZED
        );
        airnodeIdToClientAddressToWhitelistExpiration[airnodeId][
            clientAddress
        ] = expiration;
        emit SetWhitelistExpiration(
            airnodeId,
            clientAddress,
            expiration,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelist status of a client
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param clientAddress Client address
    /// @param status Whitelist status to be set
    function setWhitelistStatus(
        bytes32 airnodeId,
        address clientAddress,
        bool status
    ) external override {
        require(
            adminStatuses[msg.sender] == AdminStatus.SuperAdmin ||
                msg.sender == metaAdmin,
            ERROR_UNAUTHORIZED
        );
        airnodeIdToClientAddressToWhitelistStatus[airnodeId][
            clientAddress
        ] = status;
        emit SetWhitelistStatus(airnodeId, clientAddress, status, msg.sender);
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
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param endpointId Endpoint ID
    /// @param requester Requester from `RequesterStore.sol`
    /// @param designatedWallet Designated wallet
    /// @param clientAddress Client address
    /// @return Authorization status of the request
    function isAuthorized(
        bytes32 requestId, // solhint-disable-line
        bytes32 airnodeId,
        bytes32 endpointId, // solhint-disable-line
        address requester, // solhint-disable-line
        address designatedWallet,
        address clientAddress
    ) external view override returns (bool) {
        return
            designatedWallet.balance != 0 &&
            (airnodeIdToClientAddressToWhitelistStatus[airnodeId][
                clientAddress
            ] ||
                airnodeIdToClientAddressToWhitelistExpiration[airnodeId][
                    clientAddress
                ] >
                block.timestamp);
    }
}
