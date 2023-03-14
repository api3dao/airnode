// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@api3dao/nft-authorizer/contracts/RequesterAuthorizerWithErc721.sol";

contract MockRequesterAuthorizerWithErc721 is RequesterAuthorizerWithErc721 {
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    )
        RequesterAuthorizerWithErc721(
            _accessControlRegistry,
            _adminRoleDescription
        )
    {}
}
