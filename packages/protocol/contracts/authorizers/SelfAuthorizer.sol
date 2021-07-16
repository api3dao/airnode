// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../interfaces/IAirnodeRrp.sol";
import "./interfaces/ISelfAuthorizer.sol";

/// @title Authorizer contract where each Airnode is their own admin
contract SelfAuthorizer is ISelfAuthorizer {
    string private constant ERROR_UNAUTHORIZED = "Unauthorized";
    string private constant ERROR_ZERO_ADDRESS = "Zero address";
    string private constant ERROR_EXPIRATION_NOT_EXTENDED =
        "Expiration not extended";

    /// @dev Authorizer contracts can use `authorizerType` to signal their type
    uint256 public immutable override authorizerType = 2;
    IAirnodeRrp public airnodeRrp;
    mapping(bytes32 => mapping(address => AdminStatus))
        public airnodeIdToAdminStatuses;
    mapping(bytes32 => mapping(address => uint256))
        public airnodeIdToClientAddressToWhitelistExpiration;
    mapping(bytes32 => mapping(address => bool))
        public airnodeIdToClientAddressToWhitelistStatus;

    /// @param _airnodeRrp Airnode RRP contract address
    constructor(address _airnodeRrp) {
        require(_airnodeRrp != address(0), ERROR_ZERO_ADDRESS);
        airnodeRrp = IAirnodeRrp(_airnodeRrp);
    }

    /// @notice Called by the Airnode admin to set the admin status of an
    /// address
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param admin Address whose admin status will be set
    /// @param status Admin status
    function setAdminStatus(
        bytes32 airnodeId,
        address admin,
        AdminStatus status
    ) external override {
        (address airnodeAdmin, , ) = airnodeRrp.getAirnodeParameters(airnodeId);
        require(msg.sender == airnodeAdmin, ERROR_UNAUTHORIZED);
        airnodeIdToAdminStatuses[airnodeId][admin] = status;
        emit SetAdminStatus(airnodeId, admin, status);
    }

    /// @notice Called by an admin to renounce their admin status
    /// @dev To minimize the number of transactions the Airnode admin will have
    /// to make, the contract is implemented optimistically, i.e., the admins
    /// are expected to renounce their admin status when they are needed to.
    /// If this is not the case, the Airnode admin can always revoke their
    /// adminship.
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    function renounceAdminStatus(bytes32 airnodeId) external override {
        require(
            airnodeIdToAdminStatuses[airnodeId][msg.sender] >
                AdminStatus.Unauthorized,
            ERROR_UNAUTHORIZED
        );
        airnodeIdToAdminStatuses[airnodeId][msg.sender] = AdminStatus
        .Unauthorized;
        emit RenouncedAdminStatus(airnodeId, msg.sender);
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
        (address airnodeAdmin, , ) = airnodeRrp.getAirnodeParameters(airnodeId);
        require(
            airnodeIdToAdminStatuses[airnodeId][msg.sender] >=
                AdminStatus.Admin ||
                msg.sender == airnodeAdmin,
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

    /// @notice Called by a super admin to extend the whitelisting of a client
    /// @param airnodeId Airnode ID from `AirnodeParameterStore.sol`
    /// @param clientAddress Client address
    /// @param expiration Timestamp at which the whitelisting of the client
    /// will expire
    function setWhitelistExpiration(
        bytes32 airnodeId,
        address clientAddress,
        uint256 expiration
    ) external override {
        (address airnodeAdmin, , ) = airnodeRrp.getAirnodeParameters(airnodeId);
        require(
            airnodeIdToAdminStatuses[airnodeId][msg.sender] ==
                AdminStatus.SuperAdmin ||
                msg.sender == airnodeAdmin,
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
        (address airnodeAdmin, , ) = airnodeRrp.getAirnodeParameters(airnodeId);
        require(
            airnodeIdToAdminStatuses[airnodeId][msg.sender] ==
                AdminStatus.SuperAdmin ||
                msg.sender == airnodeAdmin,
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
