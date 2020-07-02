// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface Client {
    function endorserId()
      external
      view
      returns(bytes32);
}
