/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let inplaceMedian;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  const roles = {
    deployer: accounts[0],
  };
  const mockInPlaceMedianFactory = await hre.ethers.getContractFactory('MockInPlaceMedian', roles.deployer);
  inplaceMedian = await mockInPlaceMedianFactory.deploy();
});

describe('computeMedianInPlace', function () {
  context('Array length is 1-9', function () {
    it('computes median', async function () {
      for (let arrayLength = 1; arrayLength <= 9; arrayLength++) {
        const array = Array.from(Array(arrayLength), (_, i) => i - Math.floor(arrayLength / 2));
        const shuffledArray = array
          .map((value) => ({ value, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .map(({ value }) => value);
        const median = (await inplaceMedian.externalComputeMedianInPlace(shuffledArray)).toNumber();
        let actualMedian;
        if (arrayLength % 2 === 1) {
          actualMedian = array[Math.floor(arrayLength / 2)];
        } else {
          const median1 = array[arrayLength / 2 - 1];
          const median2 = array[arrayLength / 2];
          const medianHalf1 = Math.floor(Math.abs(median1) / 2) * Math.sign(median1);
          const medianHalf2 = Math.floor(Math.abs(median2) / 2) * Math.sign(median2);
          actualMedian = medianHalf1 + medianHalf2;
        }
        expect(median).to.equal(actualMedian);
      }
    });
  });
  context('Array length is larger than 9', function () {
    it('reverts', async function () {
      await expect(inplaceMedian.externalComputeMedianInPlace(Array(10).fill(0))).to.not.be.reverted;
      await expect(inplaceMedian.externalComputeMedianInPlace(Array(11).fill(0))).to.be.reverted;
      await expect(inplaceMedian.externalComputeMedianInPlace(Array(12).fill(0))).to.be.reverted;
    });
  });
});
