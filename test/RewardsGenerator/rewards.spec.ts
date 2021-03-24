import {ethers} from 'hardhat';
import {Contract, ContractFactory} from 'ethers';

import {
  expandTo18Decimals,
  advanceBlockTo,
  advanceBlockWith,
  latestBlock,
  humanBalance,
} from '../shared/utilities';

import {deployRewardsGenerator, deployOneX} from '../shared/deploy';

import chai, {expect} from 'chai';
import {waffleChai} from '@ethereum-waffle/chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
chai.use(waffleChai);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// OneX token locks
const LOCK_FROM_BLOCK = 250;
const LOCK_TO_BLOCK = 500;

// MasterBreeder halving settings
// The block count value should represent one week's worth of blocks on whatever network the contracts are deployed on
// Ethereum: ~45361
// BSC: ~201600
// Harmony: ~302400
// For testing use 250
// const HALVING_AFTER_BLOCK_COUNT = 45361

describe('RewardsGenerator::Rewards', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let minter: SignerWithAddress;
  let dev: SignerWithAddress;
  let liquidityFund: SignerWithAddress;
  let communityFund: SignerWithAddress;
  let founderFund: SignerWithAddress;

  let ERC20Mock: ContractFactory;
  let govToken: Contract;

  before(async function () {
    signers = await ethers.getSigners();
    alice = signers[0];
    bob = signers[1];
    carol = signers[2];
    minter = signers[3];
    dev = signers[4];
    liquidityFund = signers[5];
    communityFund = signers[6];
    founderFund = signers[7];

    ERC20Mock = await ethers.getContractFactory('ERC20Mock', minter);
  });

  context('Entering & withdrawing from pools + claiming rewards', function () {
    let lp: Contract;
    let lp2: Contract;

    beforeEach(async function () {
      lp = await ERC20Mock.deploy('LPToken', 'LP', expandTo18Decimals(1000000));
      await lp.transfer(alice.address, expandTo18Decimals(1000));
      await lp.transfer(bob.address, expandTo18Decimals(1000));
      await lp.transfer(carol.address, expandTo18Decimals(1000));

      lp2 = await ERC20Mock.deploy(
        'LPToken2',
        'LP2',
        expandTo18Decimals(1000000)
      );
      await lp2.transfer(alice.address, expandTo18Decimals(1000));
      await lp2.transfer(bob.address, expandTo18Decimals(1000));
      await lp2.transfer(carol.address, expandTo18Decimals(1000));
    });

    it('should not pay out ONEx rewards before farming has started', async function () {
      // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
      const rewardsPerBlock = 1;
      const rewardsStartAtBlock = 100000000;

      govToken = await deployOneX(alice, LOCK_FROM_BLOCK, LOCK_TO_BLOCK);

      const generator = await deployRewardsGenerator(
        signers,
        govToken,
        expandTo18Decimals(rewardsPerBlock),
        rewardsStartAtBlock,
        1000
      );

      await govToken.transferOwnership(generator.address);

      expect(await govToken.totalSupply()).to.equal(0);

      await generator.add(rewardsPerBlock, lp.address, true);

      expect(await govToken.totalSupply()).to.equal(0);

      await lp
        .connect(bob)
        .approve(generator.address, expandTo18Decimals(1000));

      // 0 amount deposits will be reverted
      await expect(
        generator.connect(bob).deposit(0, 0, ZERO_ADDRESS)
      ).to.be.reverted;

      await generator
        .connect(bob)
        .deposit(0, expandTo18Decimals(100), ZERO_ADDRESS);

      expect(await govToken.totalSupply()).to.equal(0);

      await generator.connect(bob).claimReward(0);
      expect(await govToken.totalSupply()).to.equal(0);
      expect(await govToken.balanceOf(bob.address)).to.equal(
        expandTo18Decimals(0)
      );
    });

    it('should pay out ONEx rewards after farming has started', async function () {
      this.timeout(0);
      const debugMessages = false;

      // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
      const rewardsPerBlock = 1;
      const rewardsStartAtBlock = 100;
      const rewardsMultiplierForSecondPool = 5;

      govToken = await deployOneX(alice, LOCK_FROM_BLOCK, LOCK_TO_BLOCK);

      const generator = await deployRewardsGenerator(
        signers,
        govToken,
        expandTo18Decimals(rewardsPerBlock),
        rewardsStartAtBlock,
        1000
      );

      await govToken.transferOwnership(generator.address);

      expect(await govToken.totalSupply()).to.equal(0);

      await generator.add(rewardsPerBlock, lp.address, true);

      await lp
        .connect(bob)
        .approve(generator.address, expandTo18Decimals(1000));
      await generator
        .connect(bob)
        .deposit(0, expandTo18Decimals(100), ZERO_ADDRESS);

      // Advance to the start of the rewards period
      await advanceBlockTo(rewardsStartAtBlock);

      const currentBlock = await latestBlock();
      const activeMultiplier = await generator.getMultiplier(
        currentBlock.number,
        currentBlock.number + 1
      );
      const firstMultiplier = await generator.REWARD_MULTIPLIER(0);
      expect(firstMultiplier).to.gte(activeMultiplier);

      const rewardPerBlock = await generator.REWARD_PER_BLOCK();
      expect(rewardPerBlock).to.equal(rewardPerBlock);

      // block ~101 - rewards have started & locking period has started
      // 95% rewards should now be locked until block 500
      await expect(generator.connect(bob).claimReward(0)).to.emit(
        generator,
        'SendOneXReward'
      ); // emit SendOneXReward(msg.sender, _pid, pending, lockAmount);
      /*.withArgs(
          bob.address,
          0,
          '254080000000000000000',
          '83846400000000000000'
        );*/

      if (debugMessages) humanBalance(govToken, 'totalSupply');
      const totalSupplyAfterBobClaim = await govToken.totalSupply();
      expect(totalSupplyAfterBobClaim).to.equal('128000000000000000000');

      const {
        forDev,
        forFarmer,
        forLP,
        forCom,
        forFounders,
      } = await generator.getPoolReward(
        currentBlock.number,
        currentBlock.number + 1,
        rewardsPerBlock
      );
      //console.log({forDev, forFarmer, forLP, forCom, forFounders})
      expect(totalSupplyAfterBobClaim).to.equal(
        forDev.add(forFarmer).add(forLP).add(forCom).add(forFounders)
      );

      if (debugMessages)
        humanBalance(govToken, 'balanceOf', bob.address, 'bob.address');
      let bobBalanceOf = await govToken.balanceOf(bob.address);
      expect(bobBalanceOf).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'lockOf', bob.address, 'bob.address');
      let bobLockOf = await govToken.lockOf(bob.address);
      expect(bobLockOf).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'totalBalanceOf', bob.address, 'bob.address');
      let bobTotalBalanceOf = await govToken.totalBalanceOf(bob.address);
      expect(bobTotalBalanceOf).to.gt(0);

      // block ~102 - add new pool + Carol deposits
      await generator.add(
        rewardsPerBlock * rewardsMultiplierForSecondPool,
        lp2.address,
        true
      ); //5x bonus rewards pool vs pool 0
      await lp2
        .connect(carol)
        .approve(generator.address, expandTo18Decimals(1000));
      await generator
        .connect(carol)
        .deposit(1, expandTo18Decimals(100), ZERO_ADDRESS);

      // she should have two times (two sets of rewards since we're at block 102) 5x (=10x) of Bob's block 101 rewards
      await expect(generator.connect(carol).claimReward(1)).to.emit(
        generator,
        'SendOneXReward'
      ); // emit SendOneXReward(msg.sender, _pid, pending, lockAmount);
      /*.withArgs(
          carol.address,
          1,
          '211733333333300250000',
          '69871999999989082500'
        );*/

      // After Carol has claimed her rewards
      if (debugMessages) humanBalance(govToken, 'totalSupply');
      expect(await govToken.totalSupply()).to.gt(totalSupplyAfterBobClaim);

      if (debugMessages)
        humanBalance(govToken, 'balanceOf', carol.address, 'carol.address');
      expect(await govToken.balanceOf(carol.address)).to.lt(bobBalanceOf);

      if (debugMessages)
        humanBalance(govToken, 'lockOf', carol.address, 'carol.address');
      expect(await govToken.lockOf(carol.address)).to.lt(bobLockOf);

      if (debugMessages)
        humanBalance(
          govToken,
          'totalBalanceOf',
          carol.address,
          'carol.address'
        );
      expect(await govToken.totalBalanceOf(carol.address)).to.lt(
        bobTotalBalanceOf
      );

      // Bob now joins pool 2 in order to verify that he can claim from all pools at once
      await lp2
        .connect(bob)
        .approve(generator.address, expandTo18Decimals(1000));
      await generator
        .connect(bob)
        .deposit(1, expandTo18Decimals(100), ZERO_ADDRESS);

      // Advance 10 blocks, then claim rewards from all pools
      advanceBlockWith(10);
      await generator.connect(bob).claimRewards([0, 1]);

      //expect('claimReward').to.be.calledOnContractWith(generator, [0])
      //expect('claimReward').to.be.calledOnContractWith(generator, [1])

      if (debugMessages)
        humanBalance(govToken, 'balanceOf', bob.address, 'bob.address');
      bobBalanceOf = await govToken.balanceOf(bob.address);
      expect(bobBalanceOf).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'lockOf', bob.address, 'bob.address');
      bobLockOf = await govToken.lockOf(bob.address);
      expect(bobLockOf).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'totalBalanceOf', bob.address, 'bob.address');
      bobTotalBalanceOf = await govToken.totalBalanceOf(bob.address);
      expect(bobTotalBalanceOf).to.gt(0);
    });

    it('should allow the user to claim & unlock rewards according to the rewards unlocking schedule', async function () {
      this.timeout(0);
      const debugMessages = false;

      // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
      const rewardsPerBlock = 1;
      const rewardsStartAtBlock = 500;

      const lockFromBlock = 1300;
      const lockToBlock = 1500;

      const govToken = await deployOneX(alice, lockFromBlock, lockToBlock);

      const generator = await deployRewardsGenerator(
        signers,
        govToken,
        expandTo18Decimals(rewardsPerBlock),
        rewardsStartAtBlock,
        1000
      );

      await govToken.transferOwnership(generator.address);

      expect(await govToken.totalSupply()).to.equal(0);

      await generator.add(rewardsPerBlock, lp.address, true);
      await lp
        .connect(bob)
        .approve(generator.address, expandTo18Decimals(1000));
      await generator
        .connect(bob)
        .deposit(0, expandTo18Decimals(100), ZERO_ADDRESS);

      // Advance to the start of the rewards period + 1 block
      await advanceBlockTo(rewardsStartAtBlock + 1);

      // block ~101 - rewards have started & locking period has started
      // 95% rewards should now be locked until block 500

      await expect(generator.connect(bob).claimReward(0)).to.emit(
        generator,
        'SendOneXReward'
      ); // emit SendOneXReward(msg.sender, _pid, pending, lockAmount);
      //.withArgs(bob.address, 0, '254080000000000000000', '241376000000000000000')

      expect(await govToken.totalSupply()).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'balanceOf', bob.address, 'bob.address');
      expect(await govToken.balanceOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'lockOf', bob.address, 'bob.address');
      expect(await govToken.lockOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'totalBalanceOf', bob.address, 'bob.address');
      expect(await govToken.totalBalanceOf(bob.address)).to.gt(0);

      // community, developer, founder & lp reward funds should now have been rewarded with tokens
      if (debugMessages)
        humanBalance(govToken, 'balanceOf', dev.address, 'dev.address');
      expect(await govToken.balanceOf(dev.address)).to.eq(0);

      if (debugMessages)
        humanBalance(
          govToken,
          'balanceOf',
          liquidityFund.address,
          'liquidityFund.address'
        );
      expect(await govToken.balanceOf(liquidityFund.address)).to.eq(0);

      if (debugMessages)
        humanBalance(
          govToken,
          'balanceOf',
          communityFund.address,
          'communityFund.address'
        );
      expect(await govToken.balanceOf(communityFund.address)).to.eq(0);

      if (debugMessages)
        humanBalance(
          govToken,
          'balanceOf',
          founderFund.address,
          'founderFund.address'
        );
      expect(await govToken.balanceOf(founderFund.address)).to.eq(0);

      // Advance to the start of the locking period + 1 block
      await advanceBlockTo(lockFromBlock + 1);

      // Balances should still remain the same...
      if (debugMessages)
        humanBalance(govToken, 'balanceOf', bob.address, 'bob.address');
      expect(await govToken.balanceOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'lockOf', bob.address, 'bob.address');
      expect(await govToken.lockOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'totalBalanceOf', bob.address, 'bob.address');
      expect(await govToken.totalBalanceOf(bob.address)).to.gt(0);

      // Advance to the end of the lock period - 50 blocks
      // User should now be able to claim even more of the locked rewards
      await advanceBlockTo(lockToBlock - 50);
      await expect(govToken.connect(bob).unlock()).to.emit(
        govToken,
        'Transfer'
      );
      //.withArgs(govToken.address, bob.address, '19310080000000000000')

      if (debugMessages)
        humanBalance(govToken, 'balanceOf', bob.address, 'bob.address');
      expect(await govToken.balanceOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'totalBalanceOf', bob.address, 'bob.address');
      expect(await govToken.totalBalanceOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'lockOf', bob.address, 'bob.address');
      expect(await govToken.lockOf(bob.address)).to.gt(0);

      // Advance to the end of the lock period + 10 blocks
      await advanceBlockTo(lockToBlock + 10);

      // We haven't called unlock() yet - balances should remain the same
      if (debugMessages)
        humanBalance(govToken, 'balanceOf', bob.address, 'bob.address');
      expect(await govToken.balanceOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'totalBalanceOf', bob.address, 'bob.address');
      expect(await govToken.totalBalanceOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'lockOf', bob.address, 'bob.address');
      expect(await govToken.lockOf(bob.address)).to.gt(0);

      expect(await govToken.canUnlockAmount(bob.address)).to.gt(0);

      await expect(govToken.connect(bob).unlock()).to.emit(
        govToken,
        'Transfer'
      );
      //.withArgs(govToken.address, bob.address, '463441920000000000000')

      const currentBlock = await latestBlock();
      const lastUnlockBlock = await govToken.lastUnlockBlock(bob.address);
      expect(lastUnlockBlock.toNumber()).to.lte(currentBlock.number);

      // unlock() has been called - bob should now have 0 locked tokens & 100% unlocked tokens
      if (debugMessages)
        humanBalance(govToken, 'balanceOf', bob.address, 'bob.address');
      expect(await govToken.balanceOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'totalBalanceOf', bob.address, 'bob.address');
      expect(await govToken.totalBalanceOf(bob.address)).to.gt(0);

      if (debugMessages)
        humanBalance(govToken, 'lockOf', bob.address, 'bob.address');
      expect(await govToken.lockOf(bob.address)).to.eq('0');

      if (debugMessages) humanBalance(govToken, 'totalLock');
      expect(await govToken.totalLock()).to.eq(0);
    });

    it('should not distribute ONExs if no one deposit', async function () {
      this.timeout(0);
      const debugMessages = false;
      // 1 per block farming rate starting at block 700 with the first halvening block starting 1000 blocks after the start block
      const rewardsPerBlock = 1;

      govToken = await deployOneX(alice, LOCK_FROM_BLOCK, LOCK_TO_BLOCK);

      const generator = await deployRewardsGenerator(
        signers,
        govToken,
        expandTo18Decimals(rewardsPerBlock),
        700,
        1000
      );
      await govToken.transferOwnership(generator.address);
      await generator.add(rewardsPerBlock, lp.address, true);
      await lp
        .connect(bob)
        .approve(generator.address, expandTo18Decimals(1000));

      await advanceBlockTo(699);
      expect(await govToken.totalSupply()).to.equal(0); // block 600

      await advanceBlockTo(704);
      // block 705:
      expect(await govToken.totalSupply()).to.equal(0); // block 605

      await advanceBlockTo(709);
      // block 710:
      await expect(
        generator.connect(bob).deposit(0, expandTo18Decimals(10), ZERO_ADDRESS)
      )
        .to.emit(generator, 'Deposit') //emit Deposit(msg.sender, _pid, _amount);
        .withArgs(bob.address, 0, expandTo18Decimals(10));

      expect(await govToken.totalSupply()).to.equal(0);
      expect(await govToken.balanceOf(bob.address)).to.equal(0);
      expect(await govToken.balanceOf(dev.address)).to.equal(0);
      expect(await lp.balanceOf(bob.address)).to.equal(expandTo18Decimals(990));

      await advanceBlockTo(719);
      // block 720:
      // since there's a deposit fee a user can't withdraw the exact same amount they originally deposited
      await expect(
        generator.connect(bob).withdraw(0, expandTo18Decimals(10), ZERO_ADDRESS)
      ).to.be.reverted;

      // calculate the user's deposit
      const userDepositFee = await generator.userDepFee();
      const likelyDeposit = expandTo18Decimals(10).sub(
        expandTo18Decimals(10).mul(userDepositFee).div(10000)
      );
      if (debugMessages)
        console.log(
          'Likely deposit balance (after fees)',
          ethers.utils.formatEther(likelyDeposit.toString())
        );

      await expect(
        generator.connect(bob).withdraw(0, likelyDeposit, ZERO_ADDRESS)
      )
        .to.emit(generator, 'Withdraw') //emit Withdraw(msg.sender, _pid, _amount);
        .withArgs(bob.address, 0, likelyDeposit);

      if (debugMessages)
        humanBalance(govToken, 'balanceOf', bob.address, 'bob.address');
      expect(await govToken.balanceOf(bob.address)).to.equal(
        '340467200000000000000'
      );

      if (debugMessages)
        humanBalance(govToken, 'lockOf', bob.address, 'bob.address');
      expect(await govToken.lockOf(bob.address)).to.eq('167692800000000000000');

      if (debugMessages)
        humanBalance(govToken, 'totalBalanceOf', bob.address, 'bob.address');
      expect(await govToken.totalBalanceOf(bob.address)).to.equal(
        '508160000000000000000'
      );

      expect(await govToken.totalSupply()).to.equal('512000000000000000000');
      expect(await lp.balanceOf(bob.address)).to.gte(likelyDeposit);
    });

    it('should distribute ONExs properly for each staker'),
      async () => {
        // 1 per block farming rate starting at block 300 with the first halvening block starting 1000 blocks after the start block
        const rewardsPerBlock = 1;
        const generator = await deployRewardsGenerator(
          signers,
          govToken,
          expandTo18Decimals(rewardsPerBlock),
          300,
          1000
        );

        govToken = await deployOneX(alice, LOCK_FROM_BLOCK, LOCK_TO_BLOCK);

        await govToken.transferOwnership(generator.address);
        await generator.add(rewardsPerBlock, lp.address, true);
        await lp
          .connect(alice)
          .approve(generator.address, expandTo18Decimals(1000));
        await lp
          .connect(bob)
          .approve(generator.address, expandTo18Decimals(1000));
        await lp
          .connect(carol)
          .approve(generator.address, expandTo18Decimals(1000));
        // Alice deposits 10 LPs at block 310
        await advanceBlockTo(309);
        await generator
          .connect(alice)
          .deposit(0, expandTo18Decimals(10), ZERO_ADDRESS);
        // Bob deposits 20 LPs at block 314
        await advanceBlockTo(313);
        await generator
          .connect(bob)
          .deposit(0, expandTo18Decimals(20), ZERO_ADDRESS);
        // Carol deposits 30 LPs at block 318
        await advanceBlockTo(317);
        await generator
          .connect(carol)
          .deposit(0, expandTo18Decimals(30), ZERO_ADDRESS);
        // Alice deposits 10 more LPs at block 320. At this point:
        //   Alice should have: 4*1000 + 4*1/3*1000 + 2*1/6*1000 = 5666
        //   RewardsGenerator should have the remaining: 10000 - 5666 = 4334
        await advanceBlockTo(319);
        await generator
          .connect(alice)
          .deposit(0, expandTo18Decimals(10), ZERO_ADDRESS);
        expect(await govToken.totalSupply()).to.equal(
          expandTo18Decimals(11000)
        );
        expect(await govToken.balanceOf(alice.address)).to.equal(
          expandTo18Decimals(5666)
        );
        expect(await govToken.balanceOf(bob.address)).to.equal(0);
        expect(await govToken.balanceOf(carol.address)).to.equal(0);
        expect(await govToken.balanceOf(generator.address)).to.equal(
          expandTo18Decimals(4334)
        );
        expect(await govToken.balanceOf(dev.address)).to.equal(
          expandTo18Decimals(1000)
        );
        // Bob withdraws 5 LPs at block 330. At this point:
        //   Bob should have: 4*2/3*1000 + 2*2/6*1000 + 10*2/7*1000 = 6190
        await advanceBlockTo(329);
        await generator
          .connect(bob)
          .withdraw(0, expandTo18Decimals(5), ZERO_ADDRESS);
        expect(await govToken.totalSupply()).to.equal(
          expandTo18Decimals(22000)
        );
        expect(await govToken.balanceOf(alice.address)).to.equal(
          expandTo18Decimals(5666)
        );
        expect(await govToken.balanceOf(bob.address)).to.equal(
          expandTo18Decimals(6190)
        );
        expect(await govToken.balanceOf(carol.address)).to.equal(0);
        expect(await govToken.balanceOf(generator.address)).to.equal(
          expandTo18Decimals(8144)
        );
        expect(await govToken.balanceOf(dev.address)).to.equal(
          expandTo18Decimals(2000)
        );
        // Alice withdraws 20 LPs at block 340.
        // Bob withdraws 15 LPs at block 350.
        // Carol withdraws 30 LPs at block 360.
        await advanceBlockTo(339);
        await generator
          .connect(alice)
          .withdraw(0, expandTo18Decimals(20), ZERO_ADDRESS);
        await advanceBlockTo(349);
        await generator
          .connect(bob)
          .withdraw(0, expandTo18Decimals(15), ZERO_ADDRESS);
        await advanceBlockTo(359);
        await generator
          .connect(carol)
          .withdraw(0, expandTo18Decimals(30), ZERO_ADDRESS);
        expect(await govToken.totalSupply()).to.equal(
          expandTo18Decimals(55000)
        );
        expect(await govToken.balanceOf(dev.address)).to.equal(
          expandTo18Decimals(5000)
        );
        // Alice should have: 5666 + 10*2/7*1000 + 10*2/6.5*1000 = 11600
        expect(await govToken.balanceOf(alice.address)).to.equal(
          expandTo18Decimals(11600)
        );
        // Bob should have: 6190 + 10*1.5/6.5 * 1000 + 10*1.5/4.5*1000 = 11831
        expect(await govToken.balanceOf(bob.address)).to.equal(
          expandTo18Decimals(11831)
        );
        // Carol should have: 2*3/6*1000 + 10*3/7*1000 + 10*3/6.5*1000 + 10*3/4.5*1000 + 10*1000 = 26568
        expect(await govToken.balanceOf(carol.address)).to.equal(
          expandTo18Decimals(26568)
        );
        // All of them should have 1000 LPs back.
        expect(await lp.balanceOf(alice.address)).to.equal(
          expandTo18Decimals(1000)
        );
        expect(await lp.balanceOf(bob.address)).to.equal(
          expandTo18Decimals(1000)
        );
        expect(await lp.balanceOf(carol.address)).to.equal(
          expandTo18Decimals(1000)
        );
      };

    it('should give proper ONExs allocation to each pool'),
      async () => {
        // 100 per block farming rate starting at block 400 with the first halvening block starting 1000 blocks after the start block
        const rewardsPerBlock = 1;
        const generator = await deployRewardsGenerator(
          signers,
          govToken,
          expandTo18Decimals(rewardsPerBlock),
          400,
          1000
        );

        govToken = await deployOneX(alice, LOCK_FROM_BLOCK, LOCK_TO_BLOCK);

        await govToken.transferOwnership(generator.address);
        await lp
          .connect(alice)
          .approve(generator.address, expandTo18Decimals(1000));
        await lp2
          .connect(bob)
          .approve(generator.address, expandTo18Decimals(1000));
        // Add first LP to the pool with allocation 1
        await generator.add(rewardsPerBlock, lp.address, true);
        // Alice deposits 10 LPs at block 410
        await advanceBlockTo(409);
        await generator
          .connect(alice)
          .deposit(0, expandTo18Decimals(10), ZERO_ADDRESS);
        // Add LP2 to the pool with allocation 2 at block 420
        await advanceBlockTo(419);
        await generator.add(rewardsPerBlock * 2, lp2.address, true); // 2x bonus
        // Alice should have 10*1000 pending reward
        expect(await generator.pendingReward(0, alice.address)).to.equal(
          expandTo18Decimals(10000)
        );
        // Bob deposits 10 LP2s at block 425
        await advanceBlockTo(424);
        await generator
          .connect(bob)
          .deposit(1, expandTo18Decimals(5), ZERO_ADDRESS);
        // Alice should have 10000 + 5*1/3*1000 = 11666 pending reward
        expect(await generator.pendingReward(0, alice.address)).to.equal(
          expandTo18Decimals(11666)
        );
        await advanceBlockTo(430);
        // At block 430. Bob should get 5*2/3*1000 = 3333. Alice should get ~1666 more.
        expect(await generator.pendingReward(0, alice.address)).to.equal(
          expandTo18Decimals(13333)
        );
        expect(await generator.pendingReward(1, bob.address)).to.equal(
          expandTo18Decimals(3333)
        );
      };
  });
});
