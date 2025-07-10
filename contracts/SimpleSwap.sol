// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title SimpleSwap
/// @author Pablo Gianferro
/// @notice ETHKIPU TP MODULE 3: A simplified implementation of a Uniswap-like liquidity pool for two ERC20 tokens.
/// @dev This contract handles tokenA and tokenB liquidity pools and manages internal LP tokens.
///      LP tokens are not ERC20-compatible but are tracked via internal mappings.

contract SimpleSwap {
    /// @notice owner Address of the provider of LP tokens (initialized by the contract)
    address public owner;

    /// @notice Name of the liquidity token (LP token)
    string internal _name;

    /// @notice Symbol of the liquidity token (LP token)
    string internal _symbol;

    /// @notice Decimals used for the LP token (default is 18)
    uint8 internal _decimals;

    /// @notice Address of token A
    address public tokenA;

    /// @notice Address of token B
    address public tokenB;

    /// @notice Current reserve of token A held by the pool
    uint256 public reserveA;

    /// @notice Current reserve of token B held by the pool
    uint256 public reserveB;

    /// @notice Total supply of LP tokens minted
    uint256 internal _totalSupply;

    /// @notice Mapping of LP token balances per user
    mapping(address => uint256) internal _balanceOf;

    /// @notice Initializes the contract with the two token addresses
    /// @param _tokenA Address of token A
    /// @param _tokenB Address of token B
    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
        _name = "SimpleSwap LP Token";
        _symbol = "SSLP";
        _decimals = 18;
        owner = msg.sender;
    }

    /// @notice Struct to group the two token addresses managed by the pool
    /// @dev Used to reduce stack usage when passing tokenA and tokenB together
    struct TokenPair {
        address tokenA;
        address tokenB;
    }

    /// @notice Emitted when INITIAL liquidity is added to the pool
    /// @param provider Address of the liquidity provider
    /// @param amountA Amount of token A added
    /// @param amountB Amount of token B added
    /// @param liquidityMinted Amount of LP tokens minted
    event InitialLiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );

    /// @notice Emitted when liquidity is added to the pool
    /// @param provider Address of the liquidity provider
    /// @param amountA Amount of token A added
    /// @param amountB Amount of token B added
    /// @param liquidityMinted Amount of LP tokens minted
    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );

    /// @notice Emitted when liquidity is removed from the pool
    /// @param provider Address of the liquidity provider
    /// @param amountA Amount of token A returned
    /// @param amountB Amount of token B returned
    /// @param liquidityBurned Amount of LP tokens burned
    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );

    /// @notice Emitted when a token swap is performed
    /// @param swapper Address performing the swap
    /// @param tokenIn Address of the token sent in
    /// @param amountIn Amount of token sent
    /// @param tokenOut Address of the token received
    /// @param amountOut Amount of token received
    event TokensSwapped(
        address indexed swapper,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut
    );

    /// @notice Returns the name of the LP token
    function name() external view returns (string memory) {
        return _name;
    }

    /// @notice Returns the symbol of the LP token
    function symbol() external view returns (string memory) {
        return _symbol;
    }

    /// @notice Returns the number of decimals used for the LP token
    function decimals() external view returns (uint8) {
        return _decimals;
    }

    /// @notice Adds liquidity to the pool and mints LP tokens
    /// @param tokenA_ address of tokenA
    /// @param tokenB_ address of tokenB
    /// @param amountADesired Amount of token A to add
    /// @param amountBDesired Amount of token B to add
    /// @param amountAMin Minimum accepted amount of token A
    /// @param amountBMin Minimum accepted amount of token B
    /// @param to Address to receive LP tokens
    /// @param deadline Transaction expiry timestamp
    /// @return amountA Final amount of token A added
    /// @return amountB Final amount of token B added
    /// @return liquidity Amount of LP tokens minted
    function addLiquidity(
        address tokenA_,
        address tokenB_,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        TokenPair memory tokens = TokenPair(tokenA, tokenB);

        require(deadline > block.timestamp, "Transact expired");
        require(
            tokenA_ == tokens.tokenA && tokenB_ == tokens.tokenB,
            "bad pair"
        );

        uint256 _reserveA = reserveA;
        uint256 _reserveB = reserveB;
        uint256 _supply = _totalSupply;

        if (_reserveA == 0 && _reserveB == 0) {
            // First add: use amountDesired for A and B
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            {
                //Mantain pool proportion
                uint256 amountBOptimal = (amountADesired * _reserveB) /
                    _reserveA;

                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, "B low");
                    amountA = amountADesired;
                    amountB = amountBOptimal;
                } else {
                    {
                        uint256 amountAOptimal = (amountBDesired * _reserveA) /
                            _reserveB;
                        require(amountAOptimal <= amountADesired, "A high");
                        require(amountAOptimal >= amountAMin, "A low");
                        amountA = amountAOptimal;
                        amountB = amountBDesired;
                    }
                }
            }
        }

        IERC20(tokens.tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokens.tokenB).transferFrom(msg.sender, address(this), amountB);

        if (_supply == 0) {
            liquidity = Math.sqrt(amountA * amountB);
        } else {
            liquidity = Math.min(
                (amountA * _supply) / _reserveA,
                (amountB * _supply) / _reserveB
            );
        }

        require(liquidity > 0, "zero liq");

        reserveA += amountA;
        reserveB += amountB;
        _totalSupply += liquidity;
        _balanceOf[to] += liquidity;

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
        return (amountA, amountB, liquidity);
    }

    /// @notice Removes liquidity from the pool and burns LP tokens
    /// @param tokenA_ address of tokenA
    /// @param tokenB_ address of tokenB
    /// @param liquidity amount of LP tokens to burn
    /// @param amountAMin Minimum accepted amount of token A
    /// @param amountBMin Minimum accepted amount of token B
    /// @param to Address to receive tokens
    /// @param deadline Transaction expiry timestamp
    /// @return amountA Final amount of token A added
    /// @return amountB Final amount of token B added
    function removeLiquidity(
        address tokenA_,
        address tokenB_,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB) {
        require(deadline > block.timestamp, "expired");

        uint256 _reserveA = reserveA;
        uint256 _reserveB = reserveB;
        uint256 _supply = _totalSupply;
        uint256 _userBalance = _balanceOf[msg.sender];

        TokenPair memory tokens = TokenPair(tokenA, tokenB);
        require(
            tokenA_ == tokens.tokenA && tokenB_ == tokens.tokenB,
            "bad pair"
        );

        //Calculates amount of token A and B to return to user
        amountA = (liquidity * _reserveA) / _supply;
        amountB = (liquidity * _reserveB) / _supply;

        require(amountA >= amountAMin, "A < min");
        require(amountB >= amountBMin, "B < min");
        require(_userBalance >= liquidity, "LP low");
        require(_reserveA >= amountA && _reserveB >= amountB, "reserves low");

        //Burns the LP tokens equivalent to the liquidity param from user
        _balanceOf[msg.sender] = _userBalance - liquidity;
        _totalSupply = _supply - liquidity;

        //Transfers the tokens to user

        IERC20(tokens.tokenA).transfer(to, amountA);
        IERC20(tokens.tokenB).transfer(to, amountB);

        //State
        reserveA = _reserveA - amountA;
        reserveB = _reserveB - amountB;

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidity);

        return (amountA, amountB);
    }

    /// @notice Exchanges one token for another in the exact amount.
    /// @param amountIn Amount of input tokens.
    /// @param amountOutMin: Minimum acceptable number of output tokens.
    /// @param path: Array of token addresses. (input token, output token)
    /// @param to: Recipient address.
    /// @param deadline: Timestamp for the transaction.
    /// @return amounts : Array with input and output amounts.
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline > block.timestamp, "Transact expired");
        require(path.length == 2 && path[0] != path[1], "invalid tokens");
        require(amountIn > 0, "amountIn 0");

        TokenPair memory tokens = TokenPair(tokenA, tokenB);
        uint256 _reserveA = reserveA;
        uint256 _reserveB = reserveB;

        require(
            (path[0] == tokens.tokenA && path[1] == tokens.tokenB) ||
                (path[0] == tokens.tokenB && path[1] == tokens.tokenA),
            "invalid tokens"
        );

        uint256 amountOut;

        if (path[0] == tokens.tokenA) {
            IERC20(tokens.tokenA).transferFrom(
                msg.sender,
                address(this),
                amountIn
            );
            amountOut = (amountIn * _reserveB) / (_reserveA + amountIn);
            require(amountOut >= amountOutMin, "insufficient amountOut");
            IERC20(tokens.tokenB).transfer(to, amountOut);

            reserveA = _reserveA + amountIn;
            reserveB = _reserveB - amountOut;
        } else {
            IERC20(tokens.tokenB).transferFrom(
                msg.sender,
                address(this),
                amountIn
            );
            amountOut = (amountIn * _reserveA) / (_reserveB + amountIn);
            require(amountOut >= amountOutMin, "insufficient amountOut");
            IERC20(tokens.tokenA).transfer(to, amountOut);

            reserveA = _reserveA - amountOut;
            reserveB = _reserveB + amountIn;
        }

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;

        emit TokensSwapped(msg.sender, path[0], amountIn, path[1], amountOut);

        return amounts;
    }

    /// @notice Gets the price of one token in terms of another.
    /// @param tokenA_ Address of the first ERC20 token to calculate a price for.
    /// @param tokenB_ Address of the second ERC20 token to calculate a price for.
    /// @return price Price of tokenA in terms of tokenB
    function getPrice(address tokenA_, address tokenB_)
        external
        view
        returns (uint256 price)
    {
        TokenPair memory tokens = TokenPair(tokenA, tokenB);
        require(
            (tokenA_ == tokens.tokenA && tokenB_ == tokens.tokenB) ||
                (tokenA_ == tokens.tokenB && tokenB_ == tokens.tokenA),
            "Invalid tokens"
        );

        //Obtains reserves
        uint256 reserveA_ = reserveA;
        uint256 reserveB_ = reserveB;

        require(reserveA_ > 0, "No A reserve");

        // Calculates price
        price = (reserveB_ * 1e18) / reserveA_;

        return price;
    }

    /// @notice Calculates how many tokens will be received when exchanging
    /// @param amountIn: Amount of input tokens.
    /// @param reserveIn, reserveOut: Current reserves in the contract.
    /// @return amountOut : Amount of tokens to receive.
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut) {
        require(amountIn > 0, "AmountIn < 0");
        require(reserveIn > 0 && reserveOut > 0, "Reserves < 0");

        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);

        return amountOut;
    }
}