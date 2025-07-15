// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LPToken for SimpleSwap
/// @notice ERC20-compliant LP token with mint and burnFrom functions restricted to owner
contract LPToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol,address initialOwner)
        ERC20(name, symbol)
        Ownable(initialOwner) 
    {}

    /// @notice Mints new LP tokens to a specified address
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Burns LP tokens from a specified address
    function burnFrom(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}



