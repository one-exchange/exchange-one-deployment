import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const rewardsDistributor = await deployments.getOrNull('RewardsDistributor');
  if (!rewardsDistributor) {
    const factory = await deployments.get('UniswapV2Factory');
    const oneX = await deployments.get('OneX');
    const xoneXStaking = await deployments.get('XOneXStaking');

    let woneAddress = '';

    switch (hre.network.name) {
      case 'mainnet':
        woneAddress = '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a';
        break;

      case 'testnet':
        woneAddress = '0x7466d7d0C21Fa05F32F5a0Fa27e12bdC06348Ce2';
        break;
    }

    await deploy('RewardsDistributor', {
      args: [factory.address, xoneXStaking.address, oneX.address, woneAddress],
      from: deployer,
      log: true,
    });
  }
};
export default func;
