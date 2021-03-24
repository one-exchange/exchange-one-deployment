// SPDX-License-Identifier: MIT

pragma solidity 0.5.16;

import "@exchange-one/core/contracts/UniswapV2Factory.sol";

contract ExchangeOnePairMock is UniswapV2Pair {
    constructor() public UniswapV2Pair() {}
}
