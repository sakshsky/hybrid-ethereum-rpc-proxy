const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path'); // Add this for path handling
const app = express();
const PORT = 3000;

 const ANVIL_RPC = "http://127.0.0.1:8555";
 
const MAINNET_RPC = "https://eth-mainnet.g.alchemy.com/v2/KEYYYYYYYYY";

const rewardedAddresses = new Set();

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/fund/:address', async (req, res) => {
    const address = req.params.address.toLowerCase();

    if (!/^0x[a-f0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: "Invalid Ethereum address" });
    }

    try {
        // 1. Get current balance
        const balanceResponse = await axios.post(ANVIL_RPC, {
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1
        }, {
            headers: { 'Content-Type': 'application/json' },
        });

        const currentBalance = BigInt(balanceResponse.data.result); // in wei

        // 2. Add 100 ETH
        const addAmount = BigInt("0x56BC75E2D63100000"); // 100 ETH in wei
        const newBalance = "0x" + (currentBalance + addAmount).toString(16);

        // 3. Set new balance
        await axios.post(ANVIL_RPC, {
            jsonrpc: "2.0",
            method: "anvil_setBalance",
            params: [address, newBalance],
            id: 2
        }, {
            headers: { 'Content-Type': 'application/json' },
        });

        console.log(`➕ Added 100 ETH to ${address}`);
        res.json({ status: "success", newBalance });
    } catch (err) {
        console.error("❌ Funding error:", err.message);
        res.status(500).json({ error: "Failed to fund address" });
    }
});

app.get('/new/:address', async (req, res) => {
    const address = req.params.address.toLowerCase();

    if (!/^0x[a-f0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: "Invalid Ethereum address" });
    }

    try {
        await axios.post(ANVIL_RPC, {
            jsonrpc: "2.0",
            method: "anvil_setBalance",
            params: [address, "0x56BC75E2D63100000"], // 100 ETH
            id: 1,
        }, {
            headers: { 'Content-Type': 'application/json' },
        });

        console.log(`🔁 Flash coins sent manually to ${address}`);
        rewardedAddresses.add(address);

        res.json({ status: "success", address });
    } catch (err) {
        console.error("❌ Manual funding failed:", err.message);
        res.status(500).json({ error: "Failed to set balance" });
    }
});
app.get('/', (req, res) => {
    res.json({
        status: "✅ Hybrid RPC is running",
        mainnet_rpc: MAINNET_RPC,
        anvil_rpc: ANVIL_RPC,
        timestamp: new Date().toISOString()
    });
});


app.get('/balance/:address', async (req, res) => {
    const address = req.params.address.toLowerCase();

    if (!/^0x[a-f0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: "Invalid Ethereum address" });
    }

    try {
        // Fetch from Anvil
        const anvilResponse = await axios.post(ANVIL_RPC, {
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1
        }, {
            headers: { 'Content-Type': 'application/json' },
        });

        // Fetch from Mainnet
        const mainnetResponse = await axios.post(MAINNET_RPC, {
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1
        }, {
            headers: { 'Content-Type': 'application/json' },
        });

        const anvilBalanceWei = BigInt(anvilResponse.data.result || "0x0");
        const mainnetBalanceWei = BigInt(mainnetResponse.data.result || "0x0");
        const totalBalanceWei = anvilBalanceWei + mainnetBalanceWei;
        const totalBalanceEth = Number(totalBalanceWei) / 1e18;

        res.json({
            address,
            balance: `${totalBalanceEth} ETH`,
            raw: "0x" + totalBalanceWei.toString(16),
            anvil_balance: anvilResponse.data.result,
            mainnet_balance: mainnetResponse.data.result
        });
    } catch (err) {
        console.error("❌ Balance fetch failed:", err.message);
        res.status(500).json({ error: "Failed to fetch balance" });
    }
});


app.post('/', async (req, res) => {
    const { method, params } = req.body;

console.log( req.body);
//console.log(`📥 Incoming request: ${method} to ${targetRpc}`);

    // AUTO FLASH COINS ON BALANCE CHECK
    if (method === 'eth_getBalance' && params && params[0]) {
        const address = params[0].toLowerCase();

        if (!rewardedAddresses.has(address)) {
            try {
                await axios.post(ANVIL_RPC, {
                    jsonrpc: "2.0",
                    method: "anvil_setBalance",
                    params: [address, "0x56BC75E2D63100000"], // 100 ETH
                    id: 1,
                }, {
                    headers: { 'Content-Type': 'application/json' },
                });

                console.log(`🎁 Flash coins added to: ${address}`);
                rewardedAddresses.add(address);
            } catch (error) {
                console.error("⚠️ Failed to add flash coins:", error.message);
            }
        }
    }

    // FORWARD REQUEST
    const targetRpc = (
        method === 'eth_call' ||
        method === 'eth_getBalance' ||
        method === 'eth_getCode' ||
        method === 'eth_getLogs'
    ) ? ANVIL_RPC : MAINNET_RPC;

    // NEW: Normalize block tag to 'latest' for Anvil state queries (fixes future block issue)
    let forwardedBody = { ...req.body };
    if (targetRpc === ANVIL_RPC && (method === 'eth_getBalance' || method === 'eth_call' || method === 'eth_getCode') && forwardedBody.params && forwardedBody.params.length > 1) {
        forwardedBody.params[forwardedBody.params.length - 1] = 'latest'; // Last param is usually the block tag
    }

    try {
        if (method === 'eth_getBalance') {
            // Fetch from Anvil (with normalized tag)
            const anvilResponse = await axios.post(ANVIL_RPC, forwardedBody, {
                headers: { 'Content-Type': 'application/json' },
            });

            // Fetch from Mainnet (use original body for accuracy)
            const mainnetBody = { ...req.body }; // Use original params for mainnet
            const mainnetResponse = await axios.post(MAINNET_RPC, mainnetBody, {
                headers: { 'Content-Type': 'application/json' },
            });

            const anvilBalanceWei = BigInt(anvilResponse.data.result || "0x0");
            const mainnetBalanceWei = BigInt(mainnetResponse.data.result || "0x0");
            const totalBalanceWei = anvilBalanceWei + mainnetBalanceWei;

            // Return summed balance in JSON-RPC format
            res.json({
                jsonrpc: "2.0",
                id: req.body.id,
                result: "0x" + totalBalanceWei.toString(16)
            });
        } else {
            // Normal forwarding for other methods
            const response = await axios.post(targetRpc, forwardedBody, {
                headers: { 'Content-Type': 'application/json' },
            });
            res.json(response.data);
        }
    } catch (error) {
        console.error("❌ RPC Error:", error.message);
        res.status(500).send("Erro no proxy RPC");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 RPC híbrido Ethereum rodando em http://localhost:${PORT}`);
});
