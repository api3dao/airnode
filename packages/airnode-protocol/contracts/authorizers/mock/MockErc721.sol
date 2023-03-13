// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockErc721 is ERC721 {
    constructor() ERC721("Token", "TKN") {
        for (uint256 tokenId = 0; tokenId < 10; tokenId++) {
            _mint(msg.sender, tokenId);
        }
    }
}
