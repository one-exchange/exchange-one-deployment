import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const xOneXStaking = await deployments.getOrNull('XOneXStaking');
  if (!xOneXStaking) {
    const oneX = await deployments.get('OneX');

    await deploy('XOneXStaking', {
      args: [oneX.address],
      from: deployer,
      log: true,
    });
  }
};
export default func;
