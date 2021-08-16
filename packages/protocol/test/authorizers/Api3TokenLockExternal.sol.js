/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

const AdminStatus = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
  MetaAdmin: hre.ethers.BigNumber.from(2).pow(256).sub(1),
};

let roles;
let api3TokenLockExternalFactory, api3TokenLockExternal;
let api3RequesterRrpAuthorizer, api3Token;
const ONE_MINUTE_IN_SECONDS = 60;
const LOCK_AMOUNT = 10;
const chainId = 4;
let airnodeAddress, airnodeMnemonic, airnodeWallet, airnodeId;
const adminnedId = hre.ethers.constants.HashZero;

const Errors = {
  RequesterBlocked: 'Requester blocked',
  RequesterNotBlocked: 'Requester Not Blocked',
  LockPeriodNotExpired: 'Locking period not expired',
  LowRank: 'Caller ranked low',
  Unauthorized: 'Unauthorized',
  ZeroAddress: 'Zero address',
  ZeroAmount: 'Zero amount',
  ZeroChainId: 'Zero ChainId',
};

describe('Api3TokenLockExternal', async () => {
  beforeEach(async () => {
    const accounts = await hre.ethers.getSigners();
    roles = {
      deployer: accounts[0],
      metaAdmin: accounts[1],
      newMetaAdmin: accounts[2],
      admin: accounts[3],
      superAdmin: accounts[4],
      sponsor: accounts[5],
      anotherSponsor: accounts[6],
      requester: accounts[7],
      anotherRequester: accounts[8],
      unknown: accounts[9],
    };

    const generatedWallets = utils.generateRandomAirnodeWallet();
    airnodeAddress = generatedWallets.airnodeAddress;
    airnodeMnemonic = generatedWallets.airnodeMnemonic;
    airnodeId = hre.ethers.utils.defaultAbiCoder.encode(['address'], [airnodeAddress]);
    await roles.deployer.sendTransaction({
      to: airnodeAddress,
      value: hre.ethers.utils.parseEther('1'),
    });
    airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic).connect(hre.ethers.provider);

    const api3RequesterRrpAuthorizerFactory = await hre.ethers.getContractFactory(
      'Api3RequesterRrpAuthorizer',
      roles.deployer
    );
    // deploy Api3RequesterRrpAuthorizer
    api3RequesterRrpAuthorizer = await api3RequesterRrpAuthorizerFactory.deploy(roles.metaAdmin.address);

    const api3TokenFactory = await hre.ethers.getContractFactory('Api3Token', roles.deployer);
    // deploy Api3Token
    api3Token = await api3TokenFactory.deploy(roles.deployer.address, roles.sponsor.address);
    await api3Token.connect(roles.sponsor).transfer(roles.anotherSponsor.address, LOCK_AMOUNT);

    api3TokenLockExternalFactory = await hre.ethers.getContractFactory('Api3TokenLockExternal', roles.deployer);

    api3TokenLockExternal = await api3TokenLockExternalFactory.deploy(
      roles.metaAdmin.address,
      ONE_MINUTE_IN_SECONDS,
      LOCK_AMOUNT,
      api3Token.address
    );

    // set Api3TokenLockExternal as SuperAdmin
    await api3RequesterRrpAuthorizer
      .connect(roles.metaAdmin)
      .setRank(adminnedId, api3TokenLockExternal.address, AdminStatus.SuperAdmin);

    await api3TokenLockExternal
      .connect(roles.metaAdmin)
      .setRank(adminnedId, roles.superAdmin.address, AdminStatus.SuperAdmin);

    await api3TokenLockExternal.connect(roles.metaAdmin).setRank(adminnedId, roles.admin.address, AdminStatus.Admin);

    await api3Token
      .connect(roles.sponsor)
      .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
    await api3Token
      .connect(roles.anotherSponsor)
      .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
  });

  describe('constructor', async () => {
    context('successful deployment', async () => {
      it('initialises correctly', async () => {
        const api3TokenLockExternal = await api3TokenLockExternalFactory.deploy(
          roles.metaAdmin.address,
          ONE_MINUTE_IN_SECONDS,
          LOCK_AMOUNT,
          api3Token.address
        );

        expect(await api3TokenLockExternal.metaAdmin()).to.equal(roles.metaAdmin.address);
        expect(await api3TokenLockExternal.minimumLockingTime()).to.equal(ONE_MINUTE_IN_SECONDS);
        expect(await api3TokenLockExternal.lockAmount()).to.equal(LOCK_AMOUNT);
      });
    });

    context('Meta Admin is zero address', async () => {
      it('reverts', async () => {
        await expect(
          api3TokenLockExternalFactory.deploy(
            hre.ethers.constants.AddressZero,
            ONE_MINUTE_IN_SECONDS,
            LOCK_AMOUNT,
            api3Token.address
          )
        ).to.revertedWith(Errors.ZeroAddress);
      });
    });

    context('Lock Amount is zero', async () => {
      it('reverts', async () => {
        await expect(
          api3TokenLockExternalFactory.deploy(roles.metaAdmin.address, ONE_MINUTE_IN_SECONDS, 0, api3Token.address)
        ).to.revertedWith(Errors.ZeroAmount);
      });
    });

    context('api3Token address is zero', async () => {
      it('reverts', async () => {
        await expect(
          api3TokenLockExternalFactory.deploy(
            roles.metaAdmin.address,
            ONE_MINUTE_IN_SECONDS,
            LOCK_AMOUNT,
            hre.ethers.constants.AddressZero
          )
        ).to.revertedWith(Errors.ZeroAddress);
      });
    });
  });

  describe('post deployment', async () => {
    describe('setMinimumLockingTime', async () => {
      const NEW_MINIMUM_LOCKING_TIME = 2 * ONE_MINUTE_IN_SECONDS;

      context('caller is metaAdmin', async () => {
        it('is set', async () => {
          await api3TokenLockExternal.connect(roles.metaAdmin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME);

          expect(await api3TokenLockExternal.minimumLockingTime()).to.equal(NEW_MINIMUM_LOCKING_TIME);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(roles.metaAdmin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME))
            .to.emit(api3TokenLockExternal, 'SetMinimumLockingTime')
            .withArgs(NEW_MINIMUM_LOCKING_TIME);
        });
      });

      context('caller is SuperAdmin', async () => {
        it('is set', async () => {
          await api3TokenLockExternal.connect(roles.superAdmin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME);

          expect(await api3TokenLockExternal.minimumLockingTime()).to.equal(NEW_MINIMUM_LOCKING_TIME);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(roles.superAdmin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME))
            .to.emit(api3TokenLockExternal, 'SetMinimumLockingTime')
            .withArgs(NEW_MINIMUM_LOCKING_TIME);
        });
      });

      context('caller is Admin', async () => {
        it('is set', async () => {
          await api3TokenLockExternal.connect(roles.admin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME);

          expect(await api3TokenLockExternal.minimumLockingTime()).to.equal(NEW_MINIMUM_LOCKING_TIME);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(roles.admin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME))
            .to.emit(api3TokenLockExternal, 'SetMinimumLockingTime')
            .withArgs(NEW_MINIMUM_LOCKING_TIME);
        });
      });

      context('caller is not metaAdmin', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(roles.unknown).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME)
          ).to.revertedWith(Errors.LowRank);
        });
      });
    });

    describe('setLockAmount', async () => {
      const NEW_LOCK_AMOUNT = 2 * LOCK_AMOUNT;

      context('Lock Amount is not zero', () => {
        context('caller is metaAdmin', async () => {
          it('is set', async () => {
            await api3TokenLockExternal.connect(roles.metaAdmin).setLockAmount(NEW_LOCK_AMOUNT);

            expect(await api3TokenLockExternal.lockAmount()).to.equal(NEW_LOCK_AMOUNT);
          });

          it('emits event', async () => {
            await expect(api3TokenLockExternal.connect(roles.metaAdmin).setLockAmount(NEW_LOCK_AMOUNT))
              .to.emit(api3TokenLockExternal, 'SetLockAmount')
              .withArgs(NEW_LOCK_AMOUNT);
          });
        });

        context('caller is superAdmin', async () => {
          it('is set', async () => {
            await api3TokenLockExternal.connect(roles.superAdmin).setLockAmount(NEW_LOCK_AMOUNT);

            expect(await api3TokenLockExternal.lockAmount()).to.equal(NEW_LOCK_AMOUNT);
          });

          it('emits event', async () => {
            await expect(api3TokenLockExternal.connect(roles.superAdmin).setLockAmount(NEW_LOCK_AMOUNT))
              .to.emit(api3TokenLockExternal, 'SetLockAmount')
              .withArgs(NEW_LOCK_AMOUNT);
          });
        });

        context('caller is admin', async () => {
          it('is set', async () => {
            await api3TokenLockExternal.connect(roles.admin).setLockAmount(NEW_LOCK_AMOUNT);

            expect(await api3TokenLockExternal.lockAmount()).to.equal(NEW_LOCK_AMOUNT);
          });

          it('emits event', async () => {
            await expect(api3TokenLockExternal.connect(roles.admin).setLockAmount(NEW_LOCK_AMOUNT))
              .to.emit(api3TokenLockExternal, 'SetLockAmount')
              .withArgs(NEW_LOCK_AMOUNT);
          });
        });

        context('caller is not metaAdmin', async () => {
          it('reverts', async () => {
            await expect(api3TokenLockExternal.connect(roles.unknown).setLockAmount(NEW_LOCK_AMOUNT)).to.revertedWith(
              Errors.LowRank
            );
          });
        });
      });

      context('Lock amount is zero', () => {
        it('reverts', async () => {
          await expect(api3TokenLockExternal.connect(roles.metaAdmin).setLockAmount(0)).to.revertedWith(
            Errors.ZeroAmount
          );
        });
      });
    });

    describe('blockRequester', async () => {
      context('caller is metaAdmin', async () => {
        context('requester is blocking on an airnode', async () => {
          it('sets the block', async () => {
            await api3TokenLockExternal
              .connect(roles.metaAdmin)
              .blockRequester(chainId, airnodeAddress, roles.requester.address);

            expect(
              await api3TokenLockExternal.chainIdToAirnodeToRequesterToBlockStatus(
                chainId,
                airnodeAddress,
                roles.requester.address
              )
            ).to.equal(true);

            await expect(
              api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address)
            ).to.revertedWith(Errors.RequesterBlocked);

            await api3TokenLockExternal
              .connect(roles.sponsor)
              .lock(chainId, roles.unknown.address, roles.requester.address);
            const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
            const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;

            expect(
              await api3TokenLockExternal.sponsorLockAmount(
                chainId,
                roles.unknown.address,
                roles.requester.address,
                roles.sponsor.address
              )
            ).to.equal(LOCK_AMOUNT);
            expect(
              await api3TokenLockExternal.sponsorUnlockTime(
                chainId,
                roles.unknown.address,
                roles.requester.address,
                roles.sponsor.address
              )
            ).to.equal(expectedUnlockTime);
          });

          it('emits event', async () => {
            await expect(
              api3TokenLockExternal
                .connect(roles.metaAdmin)
                .blockRequester(chainId, airnodeAddress, roles.requester.address)
            )
              .to.emit(api3TokenLockExternal, 'BlockedRequester')
              .withArgs(chainId, airnodeAddress, roles.requester.address, roles.metaAdmin.address)
              .to.emit(api3TokenLockExternal, 'Authorized')
              .withArgs(chainId, airnodeId, roles.requester.address, 0);
          });
        });
        context('requester is being blocked globally', async () => {
          it('sets the block', async () => {
            await api3TokenLockExternal
              .connect(roles.metaAdmin)
              .blockRequester(0, hre.ethers.constants.AddressZero, roles.requester.address);

            expect(
              await api3TokenLockExternal.chainIdToAirnodeToRequesterToBlockStatus(
                0,
                hre.ethers.constants.AddressZero,
                roles.requester.address
              )
            ).to.equal(true);

            await expect(
              api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address)
            ).to.revertedWith(Errors.RequesterBlocked);

            await expect(
              api3TokenLockExternal.connect(roles.sponsor).lock(chainId, roles.unknown.address, roles.requester.address)
            ).to.revertedWith(Errors.RequesterBlocked);
          });

          it('emits event', async () => {
            await expect(
              api3TokenLockExternal
                .connect(roles.metaAdmin)
                .blockRequester(0, hre.ethers.constants.AddressZero, roles.requester.address)
            )
              .to.emit(api3TokenLockExternal, 'BlockedRequester')
              .withArgs(0, hre.ethers.constants.AddressZero, roles.requester.address, roles.metaAdmin.address)
              .to.emit(api3TokenLockExternal, 'Authorized')
              .withArgs(0, hre.ethers.constants.HashZero, roles.requester.address, 0);
          });
        });
      });

      context('caller is superAdmin', async () => {
        context('requester is blocking on an airnode', async () => {
          it('sets the block', async () => {
            await api3TokenLockExternal
              .connect(roles.superAdmin)
              .blockRequester(chainId, airnodeAddress, roles.requester.address);

            expect(
              await api3TokenLockExternal.chainIdToAirnodeToRequesterToBlockStatus(
                chainId,
                airnodeAddress,
                roles.requester.address
              )
            ).to.equal(true);

            await expect(
              api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address)
            ).to.revertedWith(Errors.RequesterBlocked);

            await api3TokenLockExternal
              .connect(roles.sponsor)
              .lock(chainId, roles.unknown.address, roles.requester.address);
            const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
            const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;

            expect(
              await api3TokenLockExternal.sponsorLockAmount(
                chainId,
                roles.unknown.address,
                roles.requester.address,
                roles.sponsor.address
              )
            ).to.equal(LOCK_AMOUNT);
            expect(
              await api3TokenLockExternal.sponsorUnlockTime(
                chainId,
                roles.unknown.address,
                roles.requester.address,
                roles.sponsor.address
              )
            ).to.equal(expectedUnlockTime);
          });

          it('emits event', async () => {
            await expect(
              api3TokenLockExternal
                .connect(roles.superAdmin)
                .blockRequester(chainId, airnodeAddress, roles.requester.address)
            )
              .to.emit(api3TokenLockExternal, 'BlockedRequester')
              .withArgs(chainId, airnodeAddress, roles.requester.address, roles.superAdmin.address)
              .to.emit(api3TokenLockExternal, 'Authorized')
              .withArgs(chainId, airnodeId, roles.requester.address, 0);
          });
        });
        context('requester is being blocked globally', async () => {
          it('sets the block', async () => {
            await api3TokenLockExternal
              .connect(roles.metaAdmin)
              .blockRequester(0, hre.ethers.constants.AddressZero, roles.requester.address);

            expect(
              await api3TokenLockExternal.chainIdToAirnodeToRequesterToBlockStatus(
                0,
                hre.ethers.constants.AddressZero,
                roles.requester.address
              )
            ).to.equal(true);

            await expect(
              api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address)
            ).to.revertedWith(Errors.RequesterBlocked);

            await expect(
              api3TokenLockExternal.connect(roles.sponsor).lock(chainId, roles.unknown.address, roles.requester.address)
            ).to.revertedWith(Errors.RequesterBlocked);
          });

          it('emits event', async () => {
            await expect(
              api3TokenLockExternal
                .connect(roles.metaAdmin)
                .blockRequester(0, hre.ethers.constants.AddressZero, roles.requester.address)
            )
              .to.emit(api3TokenLockExternal, 'BlockedRequester')
              .withArgs(0, hre.ethers.constants.AddressZero, roles.requester.address, roles.metaAdmin.address)
              .to.emit(api3TokenLockExternal, 'Authorized')
              .withArgs(0, hre.ethers.constants.HashZero, roles.requester.address, 0);
          });
        });
      });

      context('caller is airnodeAdmin', async () => {
        context('requester is being blocked on airnodeAdmin`s airnode', async () => {
          it('sets the block', async () => {
            await api3TokenLockExternal
              .connect(airnodeWallet)
              .blockRequester(chainId, airnodeAddress, roles.requester.address);

            expect(
              await api3TokenLockExternal.chainIdToAirnodeToRequesterToBlockStatus(
                chainId,
                airnodeAddress,
                roles.requester.address
              )
            ).to.equal(true);

            await expect(
              api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address)
            ).to.revertedWith(Errors.RequesterBlocked);

            await api3TokenLockExternal
              .connect(roles.sponsor)
              .lock(chainId, roles.unknown.address, roles.requester.address);
            const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
            const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;

            expect(
              await api3TokenLockExternal.sponsorLockAmount(
                chainId,
                roles.unknown.address,
                roles.requester.address,
                roles.sponsor.address
              )
            ).to.equal(LOCK_AMOUNT);
            expect(
              await api3TokenLockExternal.sponsorUnlockTime(
                chainId,
                roles.unknown.address,
                roles.requester.address,
                roles.sponsor.address
              )
            ).to.equal(expectedUnlockTime);
          });

          it('emits event', async () => {
            await expect(
              api3TokenLockExternal
                .connect(airnodeWallet)
                .blockRequester(chainId, airnodeAddress, roles.requester.address)
            )
              .to.emit(api3TokenLockExternal, 'BlockedRequester')
              .withArgs(chainId, airnodeAddress, roles.requester.address, airnodeWallet.address)
              .to.emit(api3TokenLockExternal, 'Authorized')
              .withArgs(chainId, airnodeId, roles.requester.address, 0);
          });
        });
        context('requester is being blocked on another airnode', async () => {
          it('reverts', async () => {
            await expect(
              api3TokenLockExternal
                .connect(airnodeWallet)
                .blockRequester(chainId, roles.unknown.address, roles.requester.address)
            ).to.revertedWith(Errors.LowRank);
          });
        });
        context('requester is being blocked globally', async () => {
          it('reverts', async () => {
            await expect(
              api3TokenLockExternal
                .connect(airnodeWallet)
                .blockRequester(chainId, hre.ethers.constants.AddressZero, roles.requester.address)
            ).to.revertedWith(Errors.LowRank);
          });
        });
      });
      context('caller is unknown', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal
              .connect(roles.unknown)
              .blockRequester(chainId, airnodeAddress, roles.requester.address)
          ).to.revertedWith(Errors.LowRank);
        });
      });
    });

    describe('lock', async () => {
      context('caller is first time locking', async () => {
        it('is set', async () => {
          const beforeBalance = await api3Token.balanceOf(roles.sponsor.address);

          await api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address);

          const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
          const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;
          const afterBalance = await api3Token.balanceOf(roles.sponsor.address);

          expect(afterBalance).to.equal(beforeBalance.sub(LOCK_AMOUNT));

          expect(
            await api3TokenLockExternal.sponsorUnlockTime(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.sponsor.address
            )
          ).to.equal(expectedUnlockTime);
          expect(
            await api3TokenLockExternal.sponsorLockAmount(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.sponsor.address
            )
          ).to.equal(LOCK_AMOUNT);
          expect(
            await api3TokenLockExternal.chainIdToAirnodeToRequesterToTokenLocks(
              chainId,
              airnodeAddress,
              roles.requester.address
            )
          ).to.equal(1);
        });

        it('emits event', async () => {
          await expect(
            api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address)
          )
            .to.emit(api3TokenLockExternal, 'Locked')
            .withArgs(chainId, airnodeAddress, roles.requester.address, roles.sponsor.address, LOCK_AMOUNT)
            .to.emit(api3TokenLockExternal, 'Authorized')
            .withArgs(chainId, airnodeId, roles.requester.address, hre.ethers.BigNumber.from(2).pow(64).sub(1));
        });
      });

      context('caller has already locked', async () => {
        it('is set for different sponser', async () => {
          await api3Token.connect(roles.sponsor).transfer(roles.anotherSponsor.address, LOCK_AMOUNT * 2);
          await api3Token
            .connect(roles.anotherSponsor)
            .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
          const beforeBalance = await api3Token.balanceOf(roles.anotherSponsor.address);

          await api3TokenLockExternal
            .connect(roles.anotherSponsor)
            .lock(chainId, airnodeAddress, roles.requester.address);

          const now = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
          const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;
          const afterBalance = await api3Token.balanceOf(roles.anotherSponsor.address);

          expect(afterBalance).to.equal(beforeBalance.sub(LOCK_AMOUNT));

          expect(
            await api3TokenLockExternal.sponsorUnlockTime(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.anotherSponsor.address
            )
          ).to.equal(expectedUnlockTime);
          expect(
            await api3TokenLockExternal.sponsorLockAmount(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.anotherSponsor.address
            )
          ).to.equal(LOCK_AMOUNT);
          expect(
            await api3TokenLockExternal.chainIdToAirnodeToRequesterToTokenLocks(
              chainId,
              airnodeAddress,
              roles.requester.address
            )
          ).to.equal(1);
        });

        it('reverts for the same sponser', async () => {
          await api3Token
            .connect(roles.sponsor)
            .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
          await api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address);

          await expect(
            api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address)
          ).to.revertedWith('Already locked');
        });
      });

      context('requester is locking on chainId 0', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(roles.sponsor).lock(0, airnodeAddress, roles.requester.address)
          ).to.revertedWith(Errors.ZeroChainId);
        });
      });

      context('requester is locking on address zero', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal
              .connect(roles.sponsor)
              .lock(chainId, hre.ethers.constants.AddressZero, roles.requester.address)
          ).to.revertedWith(Errors.ZeroAddress);
        });
      });

      context('requester address is blocked', async () => {
        it('reverts', async () => {
          await api3TokenLockExternal
            .connect(roles.metaAdmin)
            .blockRequester(chainId, airnodeAddress, roles.requester.address);

          await expect(
            api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address)
          ).to.revertedWith(Errors.RequesterBlocked);
        });
      });
    });

    describe('unlock', async () => {
      beforeEach(async () => {
        // Lock:
        await api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address);
        await api3TokenLockExternal
          .connect(roles.anotherSponsor)
          .lock(chainId, airnodeAddress, roles.requester.address);
      });

      context('caller is unlocking successfully', async () => {
        beforeEach(async () => {
          utils.timeTravel(ONE_MINUTE_IN_SECONDS + 1000);
        });

        it('is set', async () => {
          const beforeBalance = await api3Token.balanceOf(roles.sponsor.address);

          await api3TokenLockExternal.connect(roles.sponsor).unlock(chainId, airnodeAddress, roles.requester.address);

          const afterBalance = await api3Token.balanceOf(roles.sponsor.address);
          expect(afterBalance).to.equal(beforeBalance.add(LOCK_AMOUNT));
          expect(
            await api3TokenLockExternal.sponsorUnlockTime(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.sponsor.address
            )
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.sponsorLockAmount(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.sponsor.address
            )
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.chainIdToAirnodeToRequesterToTokenLocks(
              chainId,
              airnodeAddress,
              roles.requester.address
            )
          ).to.equal(1);

          const beforeBalance2 = await api3Token.balanceOf(roles.anotherSponsor.address);

          await api3TokenLockExternal
            .connect(roles.anotherSponsor)
            .unlock(chainId, airnodeAddress, roles.requester.address);

          const afterBalance2 = await api3Token.balanceOf(roles.anotherSponsor.address);
          expect(afterBalance2).to.equal(beforeBalance2.add(LOCK_AMOUNT));
          expect(
            await api3TokenLockExternal.sponsorUnlockTime(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.anotherSponsor.address
            )
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.sponsorLockAmount(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.anotherSponsor.address
            )
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.chainIdToAirnodeToRequesterToTokenLocks(
              chainId,
              airnodeAddress,
              roles.requester.address
            )
          ).to.equal(0);
        });

        it('emits event', async () => {
          await expect(
            api3TokenLockExternal.connect(roles.sponsor).unlock(chainId, airnodeAddress, roles.requester.address)
          )
            .to.emit(api3TokenLockExternal, 'Unlocked')
            .withArgs(chainId, airnodeAddress, roles.requester.address, roles.sponsor.address, LOCK_AMOUNT);

          await expect(
            api3TokenLockExternal.connect(roles.anotherSponsor).unlock(chainId, airnodeAddress, roles.requester.address)
          )
            .to.emit(api3TokenLockExternal, 'Unlocked')
            .withArgs(chainId, airnodeAddress, roles.requester.address, roles.anotherSponsor.address, LOCK_AMOUNT)
            .to.emit(api3TokenLockExternal, 'Authorized')
            .withArgs(chainId, airnodeId, roles.requester.address, 0);
        });
      });

      context('caller period not expired', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(roles.sponsor).unlock(chainId, airnodeAddress, roles.requester.address)
          ).to.revertedWith(Errors.LockPeriodNotExpired);
        });
      });

      context('already unlocked', async () => {
        it('reverts', async () => {
          utils.timeTravel(ONE_MINUTE_IN_SECONDS + 1000);
          await api3TokenLockExternal.connect(roles.sponsor).unlock(chainId, airnodeAddress, roles.requester.address);

          await expect(
            api3TokenLockExternal.connect(roles.sponsor).unlock(chainId, airnodeAddress, roles.requester.address)
          ).to.revertedWith('No amount locked');
        });
      });

      context('requester is unlocking on chainId 0', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(roles.sponsor).unlock(0, airnodeAddress, roles.requester.address)
          ).to.revertedWith(Errors.ZeroChainId);
        });
      });

      context('requester is unlocking on address zero', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal
              .connect(roles.sponsor)
              .unlock(chainId, hre.ethers.constants.AddressZero, roles.requester.address)
          ).to.revertedWith(Errors.ZeroAddress);
        });
      });

      context('requester address is blocked', async () => {
        it('reverts', async () => {
          await api3TokenLockExternal
            .connect(roles.metaAdmin)
            .blockRequester(chainId, airnodeAddress, roles.requester.address);
          utils.timeTravel(ONE_MINUTE_IN_SECONDS + 1000);

          await expect(
            api3TokenLockExternal.connect(roles.sponsor).unlock(chainId, airnodeAddress, roles.requester.address)
          ).to.revertedWith(Errors.RequesterBlocked);
        });
      });
    });

    describe('withdrawExcess', async () => {
      const NEW_LOCK_AMOUNT = LOCK_AMOUNT / 2;
      const expectedWithdrawnAmount = LOCK_AMOUNT - NEW_LOCK_AMOUNT;

      beforeEach(async () => {
        // Lock:
        await api3TokenLockExternal.connect(roles.sponsor).lock(chainId, airnodeAddress, roles.requester.address);
        await api3TokenLockExternal
          .connect(roles.anotherSponsor)
          .lock(chainId, airnodeAddress, roles.requester.address);
      });

      context('successful withdraws amount if it is set to a lower one', async () => {
        beforeEach(async () => {
          await api3TokenLockExternal.connect(roles.metaAdmin).setLockAmount(NEW_LOCK_AMOUNT);
        });

        it('withdraws', async () => {
          const beforeBalance = await api3Token.balanceOf(roles.sponsor.address);
          // when:
          await api3TokenLockExternal
            .connect(roles.sponsor)
            .withdrawExcess(chainId, airnodeAddress, roles.requester.address);
          // then:
          const afterBalance = await api3Token.balanceOf(roles.sponsor.address);
          expect(afterBalance).to.equal(beforeBalance.add(expectedWithdrawnAmount));
          expect(
            await api3TokenLockExternal.sponsorLockAmount(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.sponsor.address
            )
          ).to.equal(NEW_LOCK_AMOUNT);

          const beforeBalance2 = await api3Token.balanceOf(roles.anotherSponsor.address);
          // when:
          await api3TokenLockExternal
            .connect(roles.anotherSponsor)
            .withdrawExcess(chainId, airnodeAddress, roles.requester.address);
          // then:
          const afterBalance2 = await api3Token.balanceOf(roles.anotherSponsor.address);
          expect(afterBalance2).to.equal(beforeBalance2.add(expectedWithdrawnAmount));
          expect(
            await api3TokenLockExternal.sponsorLockAmount(
              chainId,
              airnodeAddress,
              roles.requester.address,
              roles.anotherSponsor.address
            )
          ).to.equal(NEW_LOCK_AMOUNT);
        });

        it('emits event', async () => {
          await expect(
            api3TokenLockExternal
              .connect(roles.sponsor)
              .withdrawExcess(chainId, airnodeAddress, roles.requester.address)
          )
            .to.emit(api3TokenLockExternal, 'WithdrawnExcess')
            .withArgs(chainId, airnodeAddress, roles.requester.address, roles.sponsor.address, expectedWithdrawnAmount);
        });
      });

      context('requester address is blocked', async () => {
        beforeEach(async () => {
          await api3TokenLockExternal.connect(roles.metaAdmin).setLockAmount(NEW_LOCK_AMOUNT);
          await api3TokenLockExternal
            .connect(roles.metaAdmin)
            .blockRequester(chainId, airnodeAddress, roles.requester.address);
        });

        it('reverts', async () => {
          // then:
          await expect(
            api3TokenLockExternal
              .connect(roles.sponsor)
              .withdrawExcess(chainId, airnodeAddress, roles.requester.address)
          ).to.revertedWith(Errors.RequesterBlocked);
        });
      });

      context('requester is withdrawing on chainId 0', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(roles.sponsor).withdrawExcess(0, airnodeAddress, roles.requester.address)
          ).to.revertedWith(Errors.ZeroChainId);
        });
      });

      context('requester is withdrawing on address zero', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal
              .connect(roles.sponsor)
              .withdrawExcess(chainId, hre.ethers.constants.AddressZero, roles.requester.address)
          ).to.revertedWith(Errors.ZeroAddress);
        });
      });

      context('locked amount is not reduced', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal
              .connect(roles.sponsor)
              .withdrawExcess(chainId, airnodeAddress, roles.requester.address)
          ).to.revertedWith('Insufficient amount');
        });
      });
    });
  });
});
