import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const rewardsGenerator = await deployments.getOrNull('RewardsGenerator');
  if (!rewardsGenerator) {
    const oneXToken = await deployments.get('OneX');

    const rewardsPerBlock = hre.ethers.BigNumber.from('1000000000000000000'); // 1 ONEx
    const rewardsStartBlock = 7500000;
    const weeklyBlockCount = 302400;

    const zeroAddress = '0x0000000000000000000000000000000000000000';

    const depositFees = {
      user: 75,
      dev: 9925,
    };

    const blockDeltas = {
      start: [0, 1, 1771, 43201, 129601, 216001, 604801, 1209601],
      end: [1770, 43200, 129600, 216000, 604800, 1209600],
    };

    const feeStages = {
      user: [75, 92, 96, 98, 99, 995, 9975, 9999],
      dev: [25, 8, 4, 2, 1, 5, 25, 1],
    };

    const rewardMultipliers = [
      256,
      128,
      64,
      32,
      32,
      16,
      16,
      8,
      8,
      8,
      8,
      8,
      8,
      8,
      8,
      8,
      8,
      8,
      8,
      8,
      8,
      4,
      4,
      4,
      4,
      4,
      4,
      2,
      2,
      2,
      2,
      2,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      2,
      2,
      2,
      4,
      4,
      4,
      8,
      8,
      8,
      8,
      8,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      8,
      8,
      8,
      8,
      8,
      8,
      4,
      4,
      2,
      2,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      4,
      4,
      4,
      4,
      8,
      8,
      8,
      8,
      8,
      16,
      16,
      32,
      32,
      32,
      32,
      16,
      8,
      4,
      2,
      1,
      1,
      1,
      1,
      2,
      2,
    ];

    const constructorArgs = [
      oneXToken.address,
      zeroAddress,
      zeroAddress,
      zeroAddress,
      zeroAddress,
      rewardsPerBlock,
      rewardsStartBlock,
      weeklyBlockCount,
      depositFees.user,
      depositFees.dev,
      rewardMultipliers,
      blockDeltas.start,
      blockDeltas.end,
      feeStages.user,
      feeStages.dev,
    ];

    log({constructorArgs});

    await deploy('RewardsGenerator', {
      args: constructorArgs,
      from: deployer,
      log: true,
    });
  }
};
func.tags = ['RewardsGenerator'];
export default func;
