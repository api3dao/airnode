// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./RegistryRolesWithManager.sol";
import "./interfaces/IUint256Registry.sol";

/// @title Registry with manager that maps IDs to unsigned integers
/// @dev Does not allow zero to be registered as a number
contract Uint256Registry is RegistryRolesWithManager, IUint256Registry {
    mapping(bytes32 => uint256) private idToUint256;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    )
        RegistryRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
    {}

    /// @notice Returns if there is a registered unsigned integer with the ID
    /// and the registered unsigned integer and what it is
    /// @param id Registry ID
    /// @return success If there is a registered unsigned integer with the ID
    /// @return uint256_ Registered unsigned integer
    function tryReadRegisteredUint256(bytes32 id)
        public
        view
        override
        returns (bool success, uint256 uint256_)
    {
        uint256_ = idToUint256[id];
        success = uint256_ != 0;
    }

    /// @notice Called by registrars or the manager to register the unsigned
    /// integer with the ID
    /// @param id Registry ID
    /// @param uint256_ Unsigned integer to be registered
    function _registerUint256(bytes32 id, uint256 uint256_)
        internal
        onlyRegistrarOrManager
    {
        require(uint256_ != 0, "Cannot register zero");
        idToUint256[id] = uint256_;
    }
}
