# ShadowFinance

A privacy-preserving personal finance management dApp built with Fully Homomorphic Encryption (FHE) technology. ShadowFinance enables users to track income, expenses, budgets, and financial goals while keeping all sensitive financial data encrypted on-chain.

## Features

- **Encrypted Transactions**: Add and track income and expenses with fully encrypted data on-chain
- **Budget Management**: Set and monitor budgets with encrypted amounts
- **Financial Goals**: Create and track savings and expense goals
- **Analytics Dashboard**: View financial insights with encrypted calculations
- **Privacy-First**: All financial data is encrypted using FHEVM, ensuring complete privacy

## Tech Stack

- **Smart Contracts**: Solidity with FHEVM (Fully Homomorphic Encryption Virtual Machine)
- **Frontend**: Next.js 16 with React 19
- **Blockchain**: Ethereum (Sepolia testnet)
- **Encryption**: FHEVM v0.9 with Relayer SDK 0.3.0-5
- **Styling**: Tailwind CSS with custom glassmorphism design

## Project Structure

```
.
├── fhevm-hardhat-template/    # Smart contract development
│   ├── contracts/             # Solidity contracts
│   ├── deploy/                # Deployment scripts
│   ├── test/                  # Contract tests
│   └── tasks/                 # Hardhat custom tasks
│
└── shadowfinance-frontend/    # Next.js frontend application
    ├── app/                   # Next.js app router pages
    ├── components/            # React components
    ├── hooks/                 # Custom React hooks
    ├── fhevm/                 # FHEVM integration layer
    └── abi/                   # Contract ABIs and addresses
```

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- MetaMask or compatible Web3 wallet
- Sepolia ETH for gas fees (for testnet deployment)

### Smart Contract Setup

1. Navigate to the contract directory:
```bash
cd fhevm-hardhat-template
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
```

4. Compile contracts:
```bash
npm run compile
```

5. Run tests:
```bash
npm run test
```

6. Deploy to Sepolia:
```bash
npx hardhat deploy --network sepolia
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd shadowfinance-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Generate ABI files (requires contract deployment):
```bash
npm run genabi
```

4. Start development server:
```bash
# For local Hardhat node (mock mode)
npm run dev:mock

# For Sepolia testnet (production mode)
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Usage

1. **Connect Wallet**: Click "Connect to MetaMask" on the homepage
2. **Switch Network**: Ensure you're on Sepolia testnet
3. **Add Transactions**: Navigate to Transactions page to add income/expense
4. **Set Budget**: Go to Budget page to set monthly budgets
5. **Create Goals**: Visit Goals page to set financial goals
6. **View Analytics**: Check Dashboard and Analytics for insights

## Deployment

### Smart Contract

The contract is deployed on Sepolia testnet. Contract address can be found in:
- `shadowfinance-frontend/abi/ShadowFinanceAddresses.ts`

### Frontend

The frontend is deployed on Vercel. See `shadowfinance-frontend/DEPLOY.md` for deployment details.

## Development

### Contract Development

- Contracts are located in `fhevm-hardhat-template/contracts/`
- Main contract: `ShadowFinance.sol`
- Tests: `fhevm-hardhat-template/test/`

### Frontend Development

- Pages: `shadowfinance-frontend/app/`
- Components: `shadowfinance-frontend/components/`
- FHEVM integration: `shadowfinance-frontend/fhevm/`
- Service hooks: `shadowfinance-frontend/hooks/useShadowFinanceService.tsx`

## Security

- All financial data is encrypted using FHEVM before being stored on-chain
- Decryption requires user signature authorization
- Private keys are never exposed or transmitted
- Contract uses FHEVM ACL (Access Control List) for decryption permissions

## License

This project is licensed under the BSD-3-Clause-Clear License.

## Support

For issues and questions:
- Check the [FHEVM Documentation](https://docs.zama.ai/fhevm)
- Review contract tests for usage examples
- Check frontend hooks for integration patterns


