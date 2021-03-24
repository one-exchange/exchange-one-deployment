// SPDX-License-Identifier: MIT

pragma solidity 0.5.16;

import "@exchange-one/core/contracts/UniswapV2Factory.sol";

contract ExchangeOneFactoryMock is UniswapV2Factory {
    constructor(address _feeToSetter) public UniswapV2Factory(_feeToSetter) {}
}
