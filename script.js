const CONTRACT_ADDRESS = "0x07075A92C3aafc147D58885A5F4B539EDec292aB";

const CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "tokenA_", "type": "address" },
            { "internalType": "address", "name": "tokenB_", "type": "address" }
        ],
        "name": "getPrice",
        "outputs": [{ "internalType": "uint256", "name": "price", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
            { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
            { "internalType": "address[]", "name": "path", "type": "address[]" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "name": "swapExactTokensForTokens",
        "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "tokenA",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "tokenB",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    }
];

const TOKEN_A_ADDRESS = "0xE893eB464b251d3174f4E2210aB537918cC4FFF6"; // Dirección del token M10
const TOKEN_B_ADDRESS = "0x18d27f72Bc6B7CE5cf1998d4e4fA746630cA3C40"; // Dirección del token CR7

let provider;

async function connect() {
    try {
        let signer = null;

        if (window.ethereum == null) {
            console.log("MetaMask no está instalado; solo lectura");
            provider = ethers.getDefaultProvider();
        } else {
            provider = new ethers.BrowserProvider(window.ethereum);

            signer = await provider.getSigner();

            const address = await signer.getAddress();
            const short = address.slice(0, 6) + "..." + address.slice(-4);
            document.getElementById("account").innerText = `Conectado a: ${short}`;

        }
    } catch (err) {
        console.error("Error al conectar", err);
    }
    await updatePrice();
    await updateBalances();
}

async function updatePrice() {
    try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const price = await contract.getPrice(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS);
        const formatted = ethers.formatUnits(price, 18);
        document.querySelector("#swap-price .precio").innerText = Number(formatted).toFixed(6);
    } catch (err) {
        console.error("Error al obtener el precio:", err);
        document.querySelector("#swap-price .precio").innerText = "error";
    }
}

async function updateBalances() {
    try {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        const tokenA = new ethers.Contract(TOKEN_A_ADDRESS, [
            "function balanceOf(address) view returns (uint256)"
        ], provider);

        const tokenB = new ethers.Contract(TOKEN_B_ADDRESS, [
            "function balanceOf(address) view returns (uint256)"
        ], provider);

        const balanceA = await tokenA.balanceOf(address);
        const balanceB = await tokenB.balanceOf(address);

        document.getElementById("balanceM10").innerText = Number(ethers.formatUnits(balanceA, 18));
        document.getElementById("balanceCR7").innerText = Number(ethers.formatUnits(balanceB, 18));
    } catch (err) {
        console.error("Error al obtener los balances:", err);
    }
}

async function setValueTokenToSpend() {
    try {
        const amountInStr = document.querySelector('.IHAVE').value;
        const amountIn = ethers.parseUnits(amountInStr || "0", 18);

        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const amountOut = await contract.getPrice(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS);
        const totalOut = amountIn * amountOut / ethers.parseUnits("1", 18);

        document.querySelector('.IWANT').value = ethers.formatUnits(totalOut.toString(), 18);
    } catch (err) {
        console.error("Error al calcular IWANT:", err);
        document.querySelector('.IWANT').value = "error";
    }
}

async function handleSubmit() {
    try {
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        const inputAmount = document.querySelector(".IHAVE").value;

        if (!inputAmount || isNaN(inputAmount) || parseFloat(inputAmount) <= 0) {
            alert("Por favor ingresá una cantidad válida");
            return;
        }

        const amountIn = ethers.parseUnits(inputAmount, 18); // asumimos 18 decimales
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutos desde ahora
        const path = [TOKEN_A_ADDRESS, TOKEN_B_ADDRESS];
        const userAddress = await signer.getAddress();

        // Opción 1: definir un mínimo esperado con 1% de slippage
        const price = await contract.getPrice(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS);
        const amountOutMin = amountIn * price / 10n ** 18n * 99n / 100n;

        // Aprobación previa (solo si no lo hiciste antes)
        const tokenA = new ethers.Contract(TOKEN_A_ADDRESS, [
            "function approve(address spender, uint256 amount) public returns (bool)"
        ], signer);
        await tokenA.approve(CONTRACT_ADDRESS, amountIn);

        // Ejecutar el swap
        const tx = await contract.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            userAddress,
            deadline
        );

        alert("Transacción enviada. Esperando confirmación...");
        await tx.wait();

        alert("Swap realizado con éxito ✅");
        await updatePrice();
        await updateBalances();
    } catch (err) {
        console.error("Error en el swap:", err);
        alert("⚠️ Hubo un error al hacer el swap. Ver consola.");
    }
}