// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface IClient {
  function chainApiAddress()
      external
      view
      returns(address);

    function requesterId()
      external
      view
      returns(bytes32);
}
