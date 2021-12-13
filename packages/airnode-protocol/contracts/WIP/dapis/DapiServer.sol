// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../whitelist/Whitelist.sol";
import "../whitelist/WhitelistRolesWithManager.sol";
import "./InPlaceMedian.sol";
import "./interfaces/IBeaconServer.sol";

contract DapiServer is Whitelist, WhitelistRolesWithManager, InPlaceMedian {
    string public constant UNLIMITED_READER_ROLE_DESCRIPTION =
        "Unlimited reader";
    bytes32 public immutable unlimitedReaderRole;

    address public immutable beaconServer;

    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _beaconServer
    )
        WhitelistRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
    {
        unlimitedReaderRole = _deriveRole(
            _deriveAdminRole(manager),
            keccak256(abi.encodePacked(UNLIMITED_READER_ROLE_DESCRIPTION))
        );
        require(_beaconServer != address(0), "Beacon server address zero");
        beaconServer = _beaconServer;
    }

    function readDapi(bytes32[] calldata beaconIds)
        external
        view
        returns (int256)
    {
        require(
            readerCanReadDapi(deriveDapiId(beaconIds), msg.sender),
            "Caller not whitelisted"
        );
        uint256 beaconCount = beaconIds.length;
        int256[] memory values = new int256[](beaconCount);
        for (uint256 ind = 0; ind < beaconCount; ind++) {
            (values[ind], ) = IBeaconServer(beaconServer).readBeacon(
                beaconIds[ind]
            );
        }
        return computeMedianInPlace(values);
    }

    function readerCanReadDapi(bytes32 dapiId, address reader)
        public
        view
        returns (bool)
    {
        return
            userIsWhitelisted(dapiId, reader) ||
            userIsUnlimitedReader(reader) ||
            reader == address(0);
    }

    function deriveDapiId(bytes32[] calldata beaconIds)
        public
        pure
        returns (bytes32 dapiId)
    {
        dapiId = keccak256(abi.encodePacked(beaconIds));
    }

    function userIsUnlimitedReader(address user) private view returns (bool) {
        return
            IAccessControlRegistry(accessControlRegistry).hasRole(
                unlimitedReaderRole,
                user
            );
    }
}
