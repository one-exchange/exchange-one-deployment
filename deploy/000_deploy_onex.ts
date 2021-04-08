import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const [lockFrom, lockTo] = [23155440, 23155440];

  const oneX = await deployments.getOrNull('OneX');
  if (!oneX) {
    await deploy('OneX', {
      args: [lockFrom, lockTo],
      from: deployer,
      log: true,
    });
  }
};
func.tags = ['RewardsGenerator'];
export default func;
