import {ethers} from 'hardhat';
import {Contract, ContractFactory} from 'ethers';

import {expandTo18Decimals} from './shared/utilities';

import chai, {expect} from 'chai';
import {waffleChai} from '@ethereum-waffle/chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
chai.use(waffleChai);

import {deployOneX} from './shared/deploy';
import {createLpToken} from './shared/lp';

import UniswapV2Pair from '@exchange-one/core/build/UniswapV2Pair.json';

describe('RewardsDistributor', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;

  let XOneXStaking: ContractFactory;
  let RewardsDistributor: ContractFactory;
  let ERC20Mock: ContractFactory;
  let UniswapV2Factory: ContractFactory;
  let RewardsDistributorExploitMock: ContractFactory;

  let xOnexStaking: Contract;
  let factory: Contract;
  let pairFactory: ContractFactory;
  let rewardsDistributor: Contract;
  let exploiter: Contract;

  // Tokens
  let govToken: Contract;
  let weth: Contract;
  let dai: Contract;
  let busd: Contract;
  let link: Contract;

  // Lp pairs
  let pairs: Record<string, Contract>;

  before(async function () {
    signers = await ethers.getSigners();
    alice = signers[0];
    bob = signers[1];
    carol = signers[2];

    XOneXStaking = await ethers.getContractFactory('XOneXStaking');
    RewardsDistributor = await ethers.getContractFactory('RewardsDistributor');
    ERC20Mock = await ethers.getContractFactory('ERC20Mock');
    UniswapV2Factory = await ethers.getContractFactory('UniswapV2Factory');
    RewardsDistributorExploitMock = await ethers.getContractFactory(
      'RewardsDistributorExploitMock'
    );
  });

  beforeEach(async function () {
    this.timeout(0);
    govToken = await deployOneX(alice);
    await govToken.mint(alice.address, expandTo18Decimals(10000000));

    weth = await ERC20Mock.deploy('WETH', 'ETH', expandTo18Decimals(10000000));
    await weth.transfer(alice.address, expandTo18Decimals(100000));

    xOnexStaking = await XOneXStaking.deploy(govToken.address);
    factory = await UniswapV2Factory.deploy(alice.address);
    pairFactory = new ContractFactory(
      UniswapV2Pair.abi,
      UniswapV2Pair.bytecode,
      alice
    );
    rewardsDistributor = await RewardsDistributor.deploy(
      factory.address,
      xOnexStaking.address,
      govToken.address,
      weth.address
    );
    exploiter = await RewardsDistributorExploitMock.deploy(
      rewardsDistributor.address
    );

    busd = await ERC20Mock.deploy(
      'Binance USD',
      'BUSD',
      expandTo18Decimals(10000000)
    );
    await busd.transfer(alice.address, expandTo18Decimals(100000));

    dai = await ERC20Mock.deploy('Dai', 'DAI', expandTo18Decimals(10000000));
    await dai.transfer(alice.address, expandTo18Decimals(100000));

    link = await ERC20Mock.deploy(
      'ChainLink Token',
      'LINK',
      expandTo18Decimals(10000000)
    );
    await link.transfer(alice.address, expandTo18Decimals(100000));

    pairs = {
      'onex/weth': await createLpToken(
        alice,
        factory,
        pairFactory,
        govToken,
        weth,
        expandTo18Decimals(1000)
      ),
      'onex/busd': await createLpToken(
        alice,
        factory,
        pairFactory,
        govToken,
        busd,
        expandTo18Decimals(1000)
      ),
      'onex/dai': await createLpToken(
        alice,
        factory,
        pairFactory,
        govToken,
        dai,
        expandTo18Decimals(1000)
      ),
      //'onex/link': await createLpToken(alice, factory, pairFactory, govToken, link, expandTo18Decimals(1000)),

      'busd/weth': await createLpToken(
        alice,
        factory,
        pairFactory,
        busd,
        weth,
        expandTo18Decimals(1000)
      ),
      'busd/dai': await createLpToken(
        alice,
        factory,
        pairFactory,
        busd,
        dai,
        expandTo18Decimals(1000)
      ),
      'busd/link': await createLpToken(
        alice,
        factory,
        pairFactory,
        busd,
        link,
        expandTo18Decimals(1000)
      ),

      'dai/weth': await createLpToken(
        alice,
        factory,
        pairFactory,
        dai,
        weth,
        expandTo18Decimals(1000)
      ),
      'dai/link': await createLpToken(
        alice,
        factory,
        pairFactory,
        dai,
        link,
        expandTo18Decimals(1000)
      ),

      'link/weth': await createLpToken(
        alice,
        factory,
        pairFactory,
        link,
        weth,
        expandTo18Decimals(1000)
      ),
    };
  });

  describe('initialization', function () {
    it('should have correct values for: factory & xOnexStaking', async () => {
      expect(await rewardsDistributor.factory()).to.eq(factory.address);
      expect(await rewardsDistributor.stakingPool()).to.eq(
        xOnexStaking.address
      );
    });
  });

  describe('setBridge', function () {
    it('does not allow to set bridge for OneX', async function () {
      await expect(
        rewardsDistributor.setBridge(govToken.address, weth.address)
      ).to.be.revertedWith('RewardsDistributor: Invalid bridge');
    });

    it('does not allow to set bridge for WETH', async function () {
      await expect(
        rewardsDistributor.setBridge(weth.address, govToken.address)
      ).to.be.revertedWith('RewardsDistributor: Invalid bridge');
    });

    it('does not allow to set bridge to itself', async function () {
      await expect(
        rewardsDistributor.setBridge(busd.address, busd.address)
      ).to.be.revertedWith('RewardsDistributor: Invalid bridge');
    });

    it('emits correct event on bridge', async function () {
      await expect(rewardsDistributor.setBridge(busd.address, govToken.address))
        .to.emit(rewardsDistributor, 'LogBridgeSet')
        .withArgs(busd.address, govToken.address);
    });
  });

  describe('convert', function () {
    it('should convert OneX/WETH', async function () {
      await pairs['onex/weth'].transfer(
        rewardsDistributor.address,
        expandTo18Decimals(100)
      );
      await rewardsDistributor.convert(govToken.address, weth.address);

      expect(await govToken.balanceOf(rewardsDistributor.address)).to.equal(0);
      expect(
        await pairs['onex/weth'].balanceOf(rewardsDistributor.address)
      ).to.equal(0);
      expect(await govToken.balanceOf(xOnexStaking.address)).to.equal(
        '189756927078123437031'
      );
    });

    it('should convert OneX/BUSD', async function () {
      await pairs['onex/busd'].transfer(
        rewardsDistributor.address,
        expandTo18Decimals(100)
      );
      await rewardsDistributor.convert(govToken.address, busd.address);

      expect(await govToken.balanceOf(rewardsDistributor.address)).to.equal(0);
      expect(
        await pairs['onex/busd'].balanceOf(rewardsDistributor.address)
      ).to.equal(0);
      expect(await govToken.balanceOf(xOnexStaking.address)).to.equal(
        '189756927078123437031'
      );
    });

    it('should convert using standard ETH path', async function () {
      await pairs['busd/weth'].transfer(
        rewardsDistributor.address,
        expandTo18Decimals(100)
      );
      await rewardsDistributor.convert(busd.address, weth.address);

      expect(await govToken.balanceOf(rewardsDistributor.address)).to.equal(0);
      expect(
        await pairs['busd/weth'].balanceOf(rewardsDistributor.address)
      ).to.equal(0);
      expect(await govToken.balanceOf(xOnexStaking.address)).to.equal(
        '159089825138293427601'
      );
    });

    it('converts LINK/BUSD using a more complex path', async function () {
      await pairs['busd/link'].transfer(
        rewardsDistributor.address,
        expandTo18Decimals(100)
      );

      await rewardsDistributor.setBridge(busd.address, govToken.address);
      await rewardsDistributor.setBridge(link.address, busd.address);
      await rewardsDistributor.convert(link.address, busd.address);

      expect(await govToken.balanceOf(rewardsDistributor.address)).to.equal(0);
      expect(
        await pairs['busd/link'].balanceOf(rewardsDistributor.address)
      ).to.equal(0);
      expect(await govToken.balanceOf(xOnexStaking.address)).to.equal(
        '159089825138293427601'
      );
    });

    it('converts DAI/BUSD using a more complex path', async function () {
      await pairs['busd/dai'].transfer(
        rewardsDistributor.address,
        expandTo18Decimals(100)
      );

      await rewardsDistributor.setBridge(busd.address, govToken.address);
      await rewardsDistributor.setBridge(dai.address, busd.address);
      await rewardsDistributor.convert(dai.address, busd.address);

      expect(await govToken.balanceOf(rewardsDistributor.address)).to.equal(0);
      expect(
        await pairs['busd/dai'].balanceOf(rewardsDistributor.address)
      ).to.equal(0);
      expect(await govToken.balanceOf(xOnexStaking.address)).to.equal(
        '159089825138293427601'
      );
    });

    it('converts DAI/LINK using two step path', async function () {
      await pairs['dai/link'].transfer(
        rewardsDistributor.address,
        expandTo18Decimals(100)
      );

      await rewardsDistributor.setBridge(dai.address, busd.address);
      await rewardsDistributor.setBridge(link.address, dai.address);
      await rewardsDistributor.convert(dai.address, link.address);

      expect(await govToken.balanceOf(rewardsDistributor.address)).to.equal(0);
      expect(
        await pairs['dai/link'].balanceOf(rewardsDistributor.address)
      ).to.equal(0);
      expect(await govToken.balanceOf(xOnexStaking.address)).to.equal(
        '120096301672136374965'
      );
    });

    it('reverts if caller is not EOA', async function () {
      this.timeout(0);
      await pairs['onex/weth'].transfer(
        rewardsDistributor.address,
        expandTo18Decimals(100)
      );
      await expect(
        exploiter.convert(govToken.address, weth.address)
      ).to.be.revertedWith('RewardsDistributor: must use EOA');
    });

    it('reverts if pair does not exist', async function () {
      this.timeout(0);
      await expect(
        rewardsDistributor.convert(link.address, pairs['dai/link'].address)
      ).to.be.revertedWith('RewardsDistributor: Invalid pair');
    });

    /*it('reverts if no path is available', async function () {
      this.timeout(0)
      await pairs['busd/link'].transfer(rewardsDistributor.address, expandTo18Decimals(100))
      await expect(rewardsDistributor.convert(link.address, busd.address)).to.be.reverted

      expect(await govToken.balanceOf(rewardsDistributor.address)).to.equal(0)
      expect(await pairs['busd/link'].balanceOf(rewardsDistributor.address)).to.equal(expandTo18Decimals(100))
      expect(await govToken.balanceOf(xOnexStaking.address)).to.equal(0)
    }).retries(10)*/
  });

  describe('convertMultiple', function () {
    it('should allow to convert multiple', async function () {
      await pairs['dai/weth'].transfer(
        rewardsDistributor.address,
        expandTo18Decimals(100)
      );
      await pairs['onex/weth'].transfer(
        rewardsDistributor.address,
        expandTo18Decimals(100)
      );

      await rewardsDistributor.convertMultiple(
        [dai.address, govToken.address],
        [weth.address, weth.address]
      );

      expect(await govToken.balanceOf(rewardsDistributor.address)).to.equal(0);
      expect(
        await pairs['dai/weth'].balanceOf(rewardsDistributor.address)
      ).to.equal(0);
      expect(await govToken.balanceOf(xOnexStaking.address)).to.equal(
        '318658355868778309848'
      );
    });
  });
});
