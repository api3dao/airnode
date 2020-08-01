// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface IChainApiClient {
  function chainApiAddress()
      external
      view
      returns(address);
}
