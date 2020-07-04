/* global ethers */
// const { expect } = require('chai');

describe('ChainApi', function () {
  it('works', async function () {
    const chainApiFactory = await ethers.getContractFactory('ChainApi');
    const chainApi = await chainApiFactory.deploy();

    await chainApi.deployed();
    console.log(chainApi.address);
  });
});
