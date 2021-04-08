import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const router = await deployments.getOrNull('UniswapV2Router02');
  if (!router) {
    const factory = await deployments.get('UniswapV2Factory');
    let woneAddress = '';

    switch (hre.network.name) {
      case 'mainnet':
        woneAddress = '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a';
        break;

      case 'testnet':
        woneAddress = '0x7466d7d0C21Fa05F32F5a0Fa27e12bdC06348Ce2';
        break;
    }

    console.log(`wONE address: ${woneAddress}`);
    console.log(`factory address: ${factory.address}`);

    await deploy('UniswapV2Router02', {
      args: [factory.address, woneAddress],
      from: deployer,
      log: true,
    });
  }
};
func.tags = ['Uniswap'];
export default func;
