// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title M10 Token
/// @author Pablo Gianferro
/// @notice This token is used for swapping with CR7 in the SimpleSwap contract
/// @dev Inherits standard ERC20 functionality from OpenZeppelin
contract M10 is ERC20 {
    /// @notice Mints 1,000,000 M10 tokens to the deployer on deployment
    constructor() ERC20("Messi Token", "M10") {
        _mint(msg.sender, 1_000_000 ether);
    }
}