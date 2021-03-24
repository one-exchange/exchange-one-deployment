import {ethers} from 'hardhat';
import {Contract, ContractFactory, BigNumber} from 'ethers';

import {expandTo18Decimals} from '../shared/utilities';

import {deployRewardsGenerator, deployOneX} from '../shared/deploy';

import chai, {expect} from 'chai';
import {waffleChai} from '@ethereum-waffle/chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
chai.use(waffleChai);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// OneX token locks
const LOCK_FROM_BLOCK = 250;
const LOCK_TO_BLOCK = 500;

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

  let govToken: Contract;
  let generator: Contract;
  let ERC20Mock: ContractFactory;

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

  beforeEach(async () => {
    govToken = await deployOneX(alice, LOCK_FROM_BLOCK, LOCK_TO_BLOCK);
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

    it('should allow emergency withdraw', async function () {
      this.timeout(0);
      // 1 per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
      const rewardsPerBlock = 1;
      const generator = await deployRewardsGenerator(
        signers,
        govToken,
        expandTo18Decimals(rewardsPerBlock),
        100,
        1000
      );

      await generator.add(rewardsPerBlock, lp.address, true);

      await lp
        .connect(bob)
        .approve(generator.address, expandTo18Decimals(1000));

      await generator
        .connect(bob)
        .deposit(0, expandTo18Decimals(100), ZERO_ADDRESS);

      expect(await lp.balanceOf(bob.address)).to.equal(expandTo18Decimals(900));

      // Even for emergency withdraws there are still withdrawal penalties applied
      // Bob will end up with 975 tokens
      // Dev address should now hold 25 tokens
      await generator.connect(bob).emergencyWithdraw(0);

      expect(await lp.balanceOf(bob.address)).to.equal('974437500000000000000');
      expect(await lp.balanceOf(dev.address)).to.equal('24812500000000000000');
    });
  });
});
