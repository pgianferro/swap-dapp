// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CR7 is ERC20 {
    constructor() ERC20("Cristiano Token", "CR7") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
}