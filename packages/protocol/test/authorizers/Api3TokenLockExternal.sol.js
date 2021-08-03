/* globals context ethers */
const { expect } = require('chai');
const { timeTravel } = require('../utils');

const AdminStatus = {
  Unauthorized: 0,
  Admin: 1,
  SuperAdmin: 2,
};

let api3TokenLockExternalFactory;
const ONE_MINUTE_IN_SECONDS = 60;
const LOCK_AMOUNT = 10;

let deployer, metaAdmin, newMetaAdmin, admin, sponsor, requester, carolClient, unknown, anotherSponsor;

const Errors = {
  ClientBlacklisted: 'Client blacklisted',
  ClientNotBlacklisted: 'Client not blacklisted',
  FromClientBlacklisted: 'From Client blacklisted',
  LockPeriodNotExpired: 'Locking period not expired',
  ToClientBlacklisted: 'To Client blacklisted',
  Unauthorized: 'Unauthorized',
  ZeroAddress: 'Zero address',
  ZeroAmount: 'Zero amount',
};

const airnodeId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const chainId = 3;

describe('Api3TokenLockExternal', async () => {
  beforeEach(async () => {
    [deployer, metaAdmin, newMetaAdmin, admin, sponsor, requester, carolClient, unknown, anotherSponsor] =
      await ethers.getSigners();

    api3TokenLockExternalFactory = await ethers.getContractFactory('Api3TokenLockExternal', deployer);
  });

  describe('constructor', async () => {
    context('successful deployment', async () => {
      it('initialises correctly', async () => {
        // when:
        const api3TokenLockExternal = await api3TokenLockExternalFactory.deploy(
          metaAdmin.address,
          ONE_MINUTE_IN_SECONDS,
          LOCK_AMOUNT
        );
        // then:

        expect(await api3TokenLockExternal.metaAdmin()).to.equal(metaAdmin.address);
        expect(await api3TokenLockExternal.minimumLockingTime()).to.equal(ONE_MINUTE_IN_SECONDS);
        expect(await api3TokenLockExternal.lockAmount()).to.equal(LOCK_AMOUNT);
      });
    });

    context('Meta Admin is zero address', async () => {
      it('reverts', async () => {
        await expect(
          api3TokenLockExternalFactory.deploy(ethers.constants.AddressZero, ONE_MINUTE_IN_SECONDS, LOCK_AMOUNT)
        ).to.revertedWith(Errors.ZeroAddress);
      });
    });

    context('Lock Amount is zero', async () => {
      it('reverts', async () => {
        await expect(api3TokenLockExternalFactory.deploy(metaAdmin.address, ONE_MINUTE_IN_SECONDS, 0)).to.revertedWith(
          Errors.ZeroAmount
        );
      });
    });
  });

  describe('post deployment', async () => {
    let api3TokenLockExternal;
    let api3Token;

    beforeEach(async () => {
      // deploy Api3TokenLock
      api3TokenLockExternal = await api3TokenLockExternalFactory.deploy(
        metaAdmin.address,
        ONE_MINUTE_IN_SECONDS,
        LOCK_AMOUNT
      );

      const api3TokenFactory = await ethers.getContractFactory('Api3Token', deployer);
      // deploy Api3Token
      api3Token = await api3TokenFactory.deploy(deployer.address, sponsor.address);
    });

    describe('setMetaAdmin', async () => {
      context('caller is meta admin', async () => {
        context('address to be set', async () => {
          it('is set', async () => {
            // when:
            await api3TokenLockExternal.connect(metaAdmin).setMetaAdmin(newMetaAdmin.address);

            // then:
            expect(await api3TokenLockExternal.metaAdmin()).to.equal(newMetaAdmin.address);
          });

          it('emits event', async () => {
            await expect(api3TokenLockExternal.connect(metaAdmin).setMetaAdmin(newMetaAdmin.address))
              .to.emit(api3TokenLockExternal, 'SetMetaAdmin')
              .withArgs(newMetaAdmin.address);
          });
        });

        context('new meta admin is zero address', async () => {
          it('reverts', async () => {
            await expect(
              api3TokenLockExternal.connect(metaAdmin).setMetaAdmin(ethers.constants.AddressZero)
            ).to.revertedWith(Errors.ZeroAddress);
          });
        });
      });

      context('caller is not meta admin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLockExternal.connect(unknown).setMetaAdmin(newMetaAdmin.address)).to.revertedWith(
            Errors.Unauthorized
          );
        });
      });
    });

    describe('setAdminStatus', async () => {
      context('caller is meta admin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLockExternal.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);
          // then:
          expect(await api3TokenLockExternal.adminStatuses(admin.address)).to.equal(AdminStatus.Admin);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin))
            .to.emit(api3TokenLockExternal, 'SetAdminStatus')
            .withArgs(admin.address, AdminStatus.Admin);
        });
      });

      context('caller is not meta admin', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(unknown).setAdminStatus(admin.address, AdminStatus.Admin)
          ).to.revertedWith(Errors.Unauthorized);
        });
      });
    });

    describe('setApi3Token', async () => {
      beforeEach(async () => {
        await api3TokenLockExternal.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);
      });

      context('caller is admin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLockExternal.connect(admin).setApi3Token(api3Token.address);
          // then:
          expect(await api3TokenLockExternal.api3Token()).to.equal(api3Token.address);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(admin).setApi3Token(api3Token.address))
            .to.emit(api3TokenLockExternal, 'SetApi3Token')
            .withArgs(api3Token.address);
        });

        it('sets the burner status', async () => {
          expect(await api3Token.getBurnerStatus(api3TokenLockExternal.address)).to.equal(false);
          await api3TokenLockExternal.connect(admin).setApi3Token(api3Token.address);
          expect(await api3Token.getBurnerStatus(api3TokenLockExternal.address)).to.equal(true);
        });

        context('Api3Token is zero address', async () => {
          it('reverts', async () => {
            await expect(
              api3TokenLockExternal.connect(admin).setApi3Token(ethers.constants.AddressZero)
            ).to.revertedWith(Errors.ZeroAddress);
          });
        });

        context('Api3Token does not implement IApi3Token interface', async () => {
          it('reverts', async () => {
            await expect(api3TokenLockExternal.connect(admin).setApi3Token(unknown.address)).to.reverted;
          });
        });
      });

      context('caller is not admin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLockExternal.connect(unknown).setApi3Token(api3Token.address)).to.revertedWith(
            Errors.Unauthorized
          );
        });
      });
    });

    describe('setMinimumLockingTime', async () => {
      const NEW_MINIMUM_LOCKING_TIME = 2 * ONE_MINUTE_IN_SECONDS;

      context('caller is metaAdmin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLockExternal.connect(metaAdmin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME);
          // then:
          expect(await api3TokenLockExternal.minimumLockingTime()).to.equal(NEW_MINIMUM_LOCKING_TIME);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(metaAdmin).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME))
            .to.emit(api3TokenLockExternal, 'SetMinimumLockingTime')
            .withArgs(NEW_MINIMUM_LOCKING_TIME);
        });
      });

      context('caller is not metaAdmin', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(unknown).setMinimumLockingTime(NEW_MINIMUM_LOCKING_TIME)
          ).to.revertedWith(Errors.Unauthorized);
        });
      });
    });

    describe('setLockAmount', async () => {
      const NEW_LOCK_AMOUNT = 2 * LOCK_AMOUNT;

      context('caller is metaAdmin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLockExternal.connect(metaAdmin).setLockAmount(NEW_LOCK_AMOUNT);
          // then:
          expect(await api3TokenLockExternal.lockAmount()).to.equal(NEW_LOCK_AMOUNT);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(metaAdmin).setLockAmount(NEW_LOCK_AMOUNT))
            .to.emit(api3TokenLockExternal, 'SetLockAmount')
            .withArgs(NEW_LOCK_AMOUNT);
        });

        context('new lock amount is zero', async () => {
          it('reverts', async () => {
            await expect(api3TokenLockExternal.connect(metaAdmin).setLockAmount(0)).to.revertedWith(Errors.ZeroAmount);
          });
        });
      });

      context('caller is not admin', async () => {
        it('reverts', async () => {
          await expect(api3TokenLockExternal.connect(unknown).setLockAmount(NEW_LOCK_AMOUNT)).to.revertedWith(
            Errors.Unauthorized
          );
        });
      });
    });

    describe('setBlacklistStatus', async () => {
      context('caller is metaAdmin', async () => {
        it('is set', async () => {
          // when:
          await api3TokenLockExternal.connect(metaAdmin).setBlacklistStatus(requester.address, true);
          // then:
          expect(await api3TokenLockExternal.requesterToBlacklistStatus(requester.address)).to.equal(true);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(metaAdmin).setBlacklistStatus(requester.address, true))
            .to.emit(api3TokenLockExternal, 'SetBlacklistStatus')
            .withArgs(requester.address, true, metaAdmin.address);
        });
      });
      context('caller is not admin', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(unknown).setBlacklistStatus(requester.address, true)
          ).to.revertedWith(Errors.Unauthorized);
        });
      });
    });

    describe('lock', async () => {
      beforeEach(async () => {
        // set admin
        await api3TokenLockExternal.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 token
        await api3TokenLockExternal.connect(admin).setApi3Token(api3Token.address);
      });

      context('caller is first time locking', async () => {
        beforeEach(async () => {
          // given:
          await api3Token
            .connect(sponsor)
            .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
        });

        it('is set', async () => {
          const beforeBalance = await api3Token.balanceOf(sponsor.address);
          // when:
          await api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, requester.address);
          // then:
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;
          const afterBalance = await api3Token.balanceOf(sponsor.address);

          expect(afterBalance).to.equal(beforeBalance.sub(LOCK_AMOUNT));

          expect(
            await api3TokenLockExternal.canUnlockAt(chainId, airnodeId, requester.address, sponsor.address)
          ).to.equal(expectedUnlockTime);
          expect(
            await api3TokenLockExternal.lockAmountAt(chainId, airnodeId, requester.address, sponsor.address)
          ).to.equal(LOCK_AMOUNT);
          expect(
            await api3TokenLockExternal.airnodeToRequesterToTokenLocks(chainId, airnodeId, requester.address)
          ).to.equal(1);
        });

        it('emits event', async () => {
          // then:
          await expect(api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, requester.address))
            .to.emit(api3TokenLockExternal, 'Lock')
            .withArgs(chainId, airnodeId, requester.address, sponsor.address, LOCK_AMOUNT)
            .to.emit(api3TokenLockExternal, 'Authorize')
            .withArgs(chainId, airnodeId, requester.address, ethers.BigNumber.from('0xffffffffffffffff'));
        });
      });

      context('caller has already locked', async () => {
        it('is set for different sponser', async () => {
          await api3Token.connect(sponsor).transfer(anotherSponsor.address, LOCK_AMOUNT * 2);
          await api3Token
            .connect(anotherSponsor)
            .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
          const beforeBalance = await api3Token.balanceOf(anotherSponsor.address);
          // when:
          await api3TokenLockExternal.connect(anotherSponsor).lock(chainId, airnodeId, requester.address);
          // then:
          const now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
          const expectedUnlockTime = now + ONE_MINUTE_IN_SECONDS;
          const afterBalance = await api3Token.balanceOf(anotherSponsor.address);

          expect(afterBalance).to.equal(beforeBalance.sub(LOCK_AMOUNT));

          expect(
            await api3TokenLockExternal.canUnlockAt(chainId, airnodeId, requester.address, anotherSponsor.address)
          ).to.equal(expectedUnlockTime);
          expect(
            await api3TokenLockExternal.lockAmountAt(chainId, airnodeId, requester.address, anotherSponsor.address)
          ).to.equal(LOCK_AMOUNT);
          expect(
            await api3TokenLockExternal.airnodeToRequesterToTokenLocks(chainId, airnodeId, requester.address)
          ).to.equal(1);
        });

        it('reverts for the same sponsor', async () => {
          // given:
          await api3Token
            .connect(sponsor)
            .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
          await api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, requester.address);
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, requester.address)
          ).to.revertedWith('Already locked');
        });
      });

      context('client address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLockExternal.connect(metaAdmin).setBlacklistStatus(requester.address, true);
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, requester.address)
          ).to.revertedWith(Errors.ClientBlacklisted);
        });
      });
    });

    describe('unlock', async () => {
      beforeEach(async () => {
        // set admin
        await api3TokenLockExternal.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 token
        await api3TokenLockExternal.connect(admin).setApi3Token(api3Token.address);

        await api3Token.connect(sponsor).transfer(anotherSponsor.address, LOCK_AMOUNT);

        // approve Api3TokenLock:
        await api3Token
          .connect(sponsor)
          .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
        await api3Token
          .connect(anotherSponsor)
          .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
        // Lock:
        await api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, requester.address);
        await api3TokenLockExternal.connect(anotherSponsor).lock(chainId, airnodeId, requester.address);
      });

      context('caller is unlocking successfully', async () => {
        beforeEach(async () => {
          timeTravel(ONE_MINUTE_IN_SECONDS + 1);
        });

        it('is set', async () => {
          const beforeBalance = await api3Token.balanceOf(sponsor.address);
          // when:
          await api3TokenLockExternal.connect(sponsor).unlock(chainId, airnodeId, requester.address);
          // then:
          const afterBalance = await api3Token.balanceOf(sponsor.address);
          expect(afterBalance).to.equal(beforeBalance.add(LOCK_AMOUNT));
          expect(
            await api3TokenLockExternal.canUnlockAt(chainId, airnodeId, requester.address, sponsor.address)
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.lockAmountAt(chainId, airnodeId, requester.address, sponsor.address)
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.airnodeToRequesterToTokenLocks(chainId, airnodeId, requester.address)
          ).to.equal(1);

          const beforeBalance2 = await api3Token.balanceOf(anotherSponsor.address);
          // when:
          await api3TokenLockExternal.connect(anotherSponsor).unlock(chainId, airnodeId, requester.address);
          // then:
          const afterBalance2 = await api3Token.balanceOf(anotherSponsor.address);
          expect(afterBalance2).to.equal(beforeBalance2.add(LOCK_AMOUNT));
          expect(
            await api3TokenLockExternal.canUnlockAt(chainId, airnodeId, requester.address, anotherSponsor.address)
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.lockAmountAt(chainId, airnodeId, requester.address, anotherSponsor.address)
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.airnodeToRequesterToTokenLocks(chainId, airnodeId, requester.address)
          ).to.equal(0);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(anotherSponsor).unlock(chainId, airnodeId, requester.address))
            .to.emit(api3TokenLockExternal, 'Unlock')
            .withArgs(chainId, airnodeId, requester.address, anotherSponsor.address, LOCK_AMOUNT);

          // then:
          await expect(api3TokenLockExternal.connect(sponsor).unlock(chainId, airnodeId, requester.address))
            .to.emit(api3TokenLockExternal, 'Unlock')
            .withArgs(chainId, airnodeId, requester.address, sponsor.address, LOCK_AMOUNT)
            .to.emit(api3TokenLockExternal, 'Authorize')
            .withArgs(chainId, airnodeId, requester.address, 0);
        });
      });

      context('caller period not expired', async () => {
        it('reverts', async () => {
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).unlock(chainId, airnodeId, requester.address)
          ).to.revertedWith(Errors.LockPeriodNotExpired);
        });
      });

      context('already unlocked', async () => {
        it('reverts', async () => {
          // given:
          timeTravel(ONE_MINUTE_IN_SECONDS + 1);
          await api3TokenLockExternal.connect(sponsor).unlock(chainId, airnodeId, requester.address);
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).unlock(chainId, airnodeId, requester.address)
          ).to.revertedWith('No amount locked');
        });
      });

      context('client address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLockExternal.connect(metaAdmin).setBlacklistStatus(requester.address, true);
          timeTravel(ONE_MINUTE_IN_SECONDS);
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).unlock(chainId, airnodeId, requester.address)
          ).to.revertedWith(Errors.ClientBlacklisted);
        });
      });
    });

    describe('withdraw', async () => {
      const NEW_LOCK_AMOUNT = LOCK_AMOUNT / 2;
      const expectedWithdrawnAmount = LOCK_AMOUNT - NEW_LOCK_AMOUNT;

      beforeEach(async () => {
        // set admin
        await api3TokenLockExternal.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 token
        await api3TokenLockExternal.connect(admin).setApi3Token(api3Token.address);

        await api3Token.connect(sponsor).transfer(anotherSponsor.address, LOCK_AMOUNT);

        // approve Api3TokenLock:
        await api3Token
          .connect(sponsor)
          .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
        await api3Token
          .connect(anotherSponsor)
          .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
        // Lock:
        await api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, requester.address);
        await api3TokenLockExternal.connect(anotherSponsor).lock(chainId, airnodeId, requester.address);
      });

      context('successful withdraws amount if it is set to a lower one', async () => {
        beforeEach(async () => {
          await api3TokenLockExternal.connect(metaAdmin).setLockAmount(NEW_LOCK_AMOUNT);
        });

        it('withdraws', async () => {
          const beforeBalance = await api3Token.balanceOf(sponsor.address);
          // when:
          await api3TokenLockExternal.connect(sponsor).withdraw(chainId, airnodeId, requester.address);
          // then:
          const afterBalance = await api3Token.balanceOf(sponsor.address);
          expect(afterBalance).to.equal(beforeBalance.add(expectedWithdrawnAmount));
          expect(
            await api3TokenLockExternal.lockAmountAt(chainId, airnodeId, requester.address, sponsor.address)
          ).to.equal(NEW_LOCK_AMOUNT);

          const beforeBalance2 = await api3Token.balanceOf(anotherSponsor.address);
          // when:
          await api3TokenLockExternal.connect(anotherSponsor).withdraw(chainId, airnodeId, requester.address);
          // then:
          const afterBalance2 = await api3Token.balanceOf(anotherSponsor.address);
          expect(afterBalance2).to.equal(beforeBalance2.add(expectedWithdrawnAmount));
          expect(
            await api3TokenLockExternal.lockAmountAt(chainId, airnodeId, requester.address, anotherSponsor.address)
          ).to.equal(NEW_LOCK_AMOUNT);
        });

        it('emits event', async () => {
          await expect(api3TokenLockExternal.connect(sponsor).withdraw(chainId, airnodeId, requester.address))
            .to.emit(api3TokenLockExternal, 'Withdraw')
            .withArgs(chainId, airnodeId, requester.address, sponsor.address, expectedWithdrawnAmount);
        });
      });

      context('client address is blacklisted', async () => {
        beforeEach(async () => {
          await api3TokenLockExternal.connect(metaAdmin).setLockAmount(NEW_LOCK_AMOUNT);
          await api3TokenLockExternal.connect(metaAdmin).setBlacklistStatus(requester.address, true);
        });

        it('reverts', async () => {
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).withdraw(chainId, airnodeId, requester.address)
          ).to.revertedWith(Errors.ClientBlacklisted);
        });
      });

      context('locked amount is not reduced', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(sponsor).withdraw(chainId, airnodeId, requester.address)
          ).to.revertedWith('Insufficient amount');
        });
      });
    });

    describe('transfer', async () => {
      beforeEach(async () => {
        // set admin
        await api3TokenLockExternal.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 token
        await api3TokenLockExternal.connect(admin).setApi3Token(api3Token.address);

        // approve Api3TokenLock:
        await api3Token
          .connect(sponsor)
          .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());

        // Lock:
        await api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, requester.address);
      });

      context('from one client to another', async () => {
        it('is set', async () => {
          const lockPeriod = await api3TokenLockExternal.canUnlockAt(
            chainId,
            airnodeId,
            requester.address,
            sponsor.address
          );
          const lockAmount = await api3TokenLockExternal.lockAmountAt(
            chainId,
            airnodeId,
            requester.address,
            sponsor.address
          );
          const beforeBobWhitelistCount = await api3TokenLockExternal.airnodeToRequesterToTokenLocks(
            chainId,
            airnodeId,
            requester.address
          );
          const beforeCarolWhitelistCount = await api3TokenLockExternal.airnodeToRequesterToTokenLocks(
            chainId,
            airnodeId,
            carolClient.address
          );

          // when:
          await api3TokenLockExternal
            .connect(sponsor)
            .transfer(chainId, airnodeId, requester.address, carolClient.address);
          // then:
          expect(
            await api3TokenLockExternal.canUnlockAt(chainId, airnodeId, requester.address, sponsor.address)
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.lockAmountAt(chainId, airnodeId, requester.address, sponsor.address)
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.airnodeToRequesterToTokenLocks(chainId, airnodeId, requester.address)
          ).to.equal(beforeBobWhitelistCount - 1);
          // and:
          expect(
            await api3TokenLockExternal.canUnlockAt(chainId, airnodeId, carolClient.address, sponsor.address)
          ).to.equal(lockPeriod);
          expect(
            await api3TokenLockExternal.lockAmountAt(chainId, airnodeId, carolClient.address, sponsor.address)
          ).to.equal(lockAmount);
          expect(
            await api3TokenLockExternal.airnodeToRequesterToTokenLocks(chainId, airnodeId, carolClient.address)
          ).to.equal(beforeCarolWhitelistCount + 1);
        });

        it('emits event', async () => {
          const lockPeriod = await api3TokenLockExternal.canUnlockAt(
            chainId,
            airnodeId,
            requester.address,
            sponsor.address
          );
          const lockAmount = await api3TokenLockExternal.lockAmountAt(
            chainId,
            airnodeId,
            requester.address,
            sponsor.address
          );
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).transfer(chainId, airnodeId, requester.address, carolClient.address)
          )
            .to.emit(api3TokenLockExternal, 'Transfer')
            .withArgs(
              chainId,
              airnodeId,
              requester.address,
              carolClient.address,
              sponsor.address,
              lockAmount,
              lockPeriod
            )
            .to.emit(api3TokenLockExternal, 'Authorize')
            .withArgs(chainId, airnodeId, requester.address, 0)
            .to.emit(api3TokenLockExternal, 'Authorize')
            .withArgs(chainId, airnodeId, carolClient.address, ethers.BigNumber.from('0xffffffffffffffff'));
        });
      });

      context('caller has not locked amounts', async () => {
        it('reverts', async () => {
          // then:
          await expect(
            api3TokenLockExternal.connect(unknown).transfer(chainId, airnodeId, requester.address, carolClient.address)
          ).to.revertedWith('locked amount must be != 0');
        });
      });

      context('caller toClientAddress has existing locked amount', async () => {
        it('reverts', async () => {
          // given:
          await api3Token
            .connect(sponsor)
            .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());
          await api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, carolClient.address);
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).transfer(chainId, airnodeId, requester.address, carolClient.address)
          ).to.revertedWith('locked amount must be 0');
        });
      });

      context('fromClient address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLockExternal.connect(metaAdmin).setBlacklistStatus(requester.address, true);
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).transfer(chainId, airnodeId, requester.address, carolClient.address)
          ).to.revertedWith(Errors.FromClientBlacklisted);
        });
      });

      context('toClient address is blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLockExternal.connect(metaAdmin).setBlacklistStatus(carolClient.address, true);
          // then:
          await expect(
            api3TokenLockExternal.connect(sponsor).transfer(chainId, airnodeId, requester.address, carolClient.address)
          ).to.revertedWith(Errors.ToClientBlacklisted);
        });
      });
    });

    describe('burn', async () => {
      beforeEach(async () => {
        // set admin
        await api3TokenLockExternal.connect(metaAdmin).setAdminStatus(admin.address, AdminStatus.Admin);

        // set api3 token
        await api3TokenLockExternal.connect(admin).setApi3Token(api3Token.address);

        // approve Api3TokenLock:
        await api3Token
          .connect(sponsor)
          .approve(api3TokenLockExternal.address, await api3TokenLockExternal.lockAmount());

        // Lock:
        await api3TokenLockExternal.connect(sponsor).lock(chainId, airnodeId, requester.address);
      });

      context('successful burn of blacklisted client', async () => {
        beforeEach(async () => {
          await api3TokenLockExternal.connect(metaAdmin).setBlacklistStatus(requester.address, true);
        });

        it('burns tokens', async () => {
          const beforeTotalSupply = await api3Token.totalSupply();
          const beforeTokenLockBalance = await api3Token.balanceOf(api3TokenLockExternal.address);
          const lockAmount = await api3TokenLockExternal.lockAmountAt(
            chainId,
            airnodeId,
            requester.address,
            sponsor.address
          );
          const beforeWhitelistCount = await api3TokenLockExternal.airnodeToRequesterToTokenLocks(
            chainId,
            airnodeId,
            requester.address
          );

          // when:
          await api3TokenLockExternal.connect(metaAdmin).burn(chainId, airnodeId, requester.address, sponsor.address);

          // then:
          expect(
            await api3TokenLockExternal.canUnlockAt(chainId, airnodeId, requester.address, sponsor.address)
          ).to.equal(0);
          expect(
            await api3TokenLockExternal.lockAmountAt(chainId, airnodeId, requester.address, sponsor.address)
          ).to.equal(0);
          // and:
          expect(await api3Token.balanceOf(api3TokenLockExternal.address)).to.equal(
            beforeTokenLockBalance.sub(lockAmount)
          );
          expect(await api3Token.totalSupply()).to.equal(beforeTotalSupply.sub(lockAmount));
          expect(
            await api3TokenLockExternal.airnodeToRequesterToTokenLocks(chainId, airnodeId, requester.address)
          ).to.equal(beforeWhitelistCount.sub(1));
        });

        it('emits event', async () => {
          await expect(
            api3TokenLockExternal.connect(metaAdmin).burn(chainId, airnodeId, requester.address, sponsor.address)
          )
            .to.emit(api3TokenLockExternal, 'Burn')
            .withArgs(chainId, airnodeId, requester.address, sponsor.address)
            .to.emit(api3TokenLockExternal, 'Authorize')
            .withArgs(chainId, airnodeId, requester.address, 0);
        });
      });

      context('burn target has zero locked amount', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(metaAdmin).burn(chainId, airnodeId, requester.address, unknown.address)
          ).to.revertedWith(Errors.ZeroAmount);
        });
      });

      context('client address is not blacklisted', async () => {
        it('reverts', async () => {
          // given:
          await api3TokenLockExternal.connect(metaAdmin).setBlacklistStatus(requester.address, false);
          // then:
          await expect(
            api3TokenLockExternal.connect(metaAdmin).burn(chainId, airnodeId, requester.address, sponsor.address)
          ).to.revertedWith(Errors.ClientNotBlacklisted);
        });
      });

      context('called is not metaAdmin', async () => {
        it('reverts', async () => {
          await expect(
            api3TokenLockExternal.connect(unknown).setBlacklistStatus(requester.address, false)
          ).to.revertedWith(Errors.Unauthorized);
        });
      });
    });
  });
});
