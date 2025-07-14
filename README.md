# Hybrid Ethereum RPC Proxy

A Node.js-based hybrid RPC proxy for Ethereum development. It routes specific RPC methods (e.g., balance queries, contract calls) to a local Anvil fork for mutable state (like auto-funding test ETH), while forwarding others to a live mainnet RPC for real-world data. Ideal for testing dApps, smart contracts, or wallets without real costs.

## Features
- **Auto-Funding**: Automatically adds 100 test ETH to addresses on balance checks via Anvil.
- **Manual Endpoints**: HTTP routes for funding (`/fund/:address`), setting balances (`/new/:address`), and checking balances (`/balance/:address`).
- **RPC Proxy**: Forwards JSON-RPC requests intelligently (e.g., `eth_getBalance` to Anvil, others to mainnet).
- **Web Interface**: A simple Tailwind CSS-powered UI in `/public/index.html` for testing endpoints via browser.
- **Balance Summing**: Combines balances from Anvil (test) and mainnet (real) for `eth_getBalance` queries.
- **Remote Anvil Support**: Configurable to use a remote Anvil instance (e.g., on Digital Ocean).

## Prerequisites
- **Node.js**: v14+ (for BigInt support).
- **Foundry/Anvil**: Installed on your local machine or a remote server (e.g., Digital Ocean droplet). Run with `--fork-url <mainnet-rpc> --port 8555 --host 0.0.0.0`.
- **Mainnet RPC**: A valid endpoint (e.g., Alchemy API key; replace in code if needed).
- **Dependencies**: Express, Axios, Body-Parser (installed via `npm install`).

## Installation
1. Clone the repo:
   ```
   git clone https://github.com/yourusername/hybrid-ethereum-rpc-proxy.git
   cd hybrid-ethereum-rpc-proxy
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure RPC URLs:
   - Edit `index.js` (or your main file):
     - `ANVIL_RPC`: Set to your Anvil URL (e.g., `http://localhost:8555` or remote like `http://your-droplet-ip:8555`).
     - `MAINNET_RPC`: Use your Alchemy/Infura key.

4. Start Anvil (in a separate terminal or remote server):
   ```
   anvil --fork-url https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY --port 8555 --host 0.0.0.0
   ```

## Usage
1. Run the proxy server:
   ```
   node index.js
   ```
   - It listens on `http://localhost:3000`.

2. **Connect Tools**:
   - MetaMask/Hardhat/ethers.js: Set RPC URL to `http://localhost:3000` (Chain ID: 1 for mainnet fork).
   - Balance checks auto-fund addresses with 100 test ETH.

3. **Manual Endpoints** (via browser or curl):
   - Health check: `http://localhost:3000/` (JSON status).
   - Fund (add 100 ETH): `http://localhost:3000/fund/0xYourAddress`.
   - Set to 100 ETH: `http://localhost:3000/new/0xYourAddress`.
   - Check balance: `http://localhost:3000/balance/0xYourAddress` (sums Anvil + mainnet).

4. **Web Interface**:
   - Visit `http://localhost:3000/index.html`.
   - Enter an address and click buttons to fund/check balances or send custom RPC calls.

5. **Custom RPC Calls**:
   - POST to `http://localhost:3000/` with JSON-RPC body (e.g., via curl or Postman).

## Troubleshooting
- **Balance Not Showing in MetaMask**: Reset account in MetaMask (Settings > Advanced > Reset Account). Ensure Anvil is forked recently.
- **Connection Refused**: Check firewalls (UFW/DO) allow port 8555; verify Anvil is running with `--host 0.0.0.0`.
- **RPC Errors**: Logs show details; ensure valid mainnet API key.
- **No Funding**: Address must be valid; check console for errors.

## License
MIT License. See [LICENSE](LICENSE) for details.

---

Contributions welcome! If you find issues, open a pull request or issue.
