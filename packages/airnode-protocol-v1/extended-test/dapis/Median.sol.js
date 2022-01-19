/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let median;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  const roles = {
    deployer: accounts[0],
  };
  const mockInPlaceMedianFactory = await hre.ethers.getContractFactory('MockMedian', roles.deployer);
  median = await mockInPlaceMedianFactory.deploy();
});

describe('median', function () {
  context('Array length is 1-21', function () {
    it('computes median of randomly shuffled arrays', async function () {
      for (let arrayLength = 1; arrayLength <= 21; arrayLength++) {
        for (let iterationCount = 0; iterationCount <= 10; iterationCount++) {
          const array = Array.from(Array(arrayLength), (_, i) => i - Math.floor(arrayLength / 2));
          const shuffledArray = array
            .map((value) => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);
          const computedMedian = (await median.exposedMedian(shuffledArray)).toNumber();
          let actualMedian;
          if (arrayLength % 2 === 1) {
            actualMedian = array[Math.floor(arrayLength / 2)];
          } else {
            const median1 = array[arrayLength / 2 - 1];
            const median2 = array[arrayLength / 2];
            actualMedian = Math.floor(Math.abs(median1 + median2) / 2) * Math.sign(median1 + median2);
          }
          expect(computedMedian).to.equal(actualMedian);
        }
      }
    });
  });
});
