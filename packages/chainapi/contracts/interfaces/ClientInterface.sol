// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;


interface ClientInterface {
    function endorserId()
      external
      view
      returns(bytes32);
}
