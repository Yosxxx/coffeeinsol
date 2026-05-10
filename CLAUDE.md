This documentation serves as the blueprint for *solana-coffee-tip*. It is designed to be a high-conversion, low-friction donation tool that turns "Buy me a coffee" into a decentralized reality.

***

## 1. Project Description

*solana-coffee-tip* is a lightweight, open-source React component library that allows creators to accept tips in *SOL* or *USDT* directly on their websites. Unlike centralized platforms, it removes the middleman (except for a small protocol fee), offering instant settlement and a modern, shadcn-inspired UI.

The package handles the complexities of the Solana blockchain—wallet connections, Associated Token Accounts (ATA), and transaction simulations—letting the developer focus on their content.

***

## 2. Product Requirements Document (PRD)

### Goals

* *Plug-and-Play:* Zero-config integration for the owner.
* *Multi-Asset:* Support for both native SOL and the most used stablecoin (USDT).
* *Revenue Sustainability:* Automatic collection of a *1%* protocol fee.
* *High Performance:* Minimal bundle size impact.

### Functional Requirements

| Feature              | Description                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------- |
| *Asset Support*      | Support for native SOL and SPL-USDT.                                                         |
| *Wallet Integration* | Support for Phantom, Solflare, and other standard adapters via @solana/wallet-adapter-react. |
| *Fee Collection*     | Split every transaction: $99\%$ to creator, $1\%$ to protocol.                               |
| *ATA Management*     | Automatically detect and create USDT accounts for recipients if they don't exist.            |
| *Responsive UI*      | Mobile-first modal design with loading states and success/error feedback.                    |

### Technical Specifications

* *Framework:* React 18+ & TypeScript.
* *Styling:* Tailwind CSS (isolated) & Radix UI Primitives.
* *Blockchain:* @solana/web3.js & @solana/spl-token.
* *Bundler:* tsup (ESM & CJS support).

***

## 3. User Stories

### For the Owner (Developer)

* *As an owner,* I want to install a package and provide only my wallet address so that I can start receiving tips in under 5 minutes.
* *As an owner,* I want the package to handle USDT account creation for me so that I don't lose tips from users who want to send stablecoins.
* *As an owner,* I want a component that matches my site's aesthetic without fighting with global CSS.

### For the Tipper (End User)

* *As a user,* I want to click one button and see a clean modal so that I don't get distracted by a complex UI.
* *As a user,* I want to be prompted to connect my wallet if I haven't already so that I don't get "transaction failed" errors.
* *As a user,* I want to see a confirmation when my tip is successfully sent to the creator.

***

## 4. Revenue Model: The 1% Protocol Fee

The package is "free" to use, but every transaction includes two instructions to ensure the sustainability of the tool.

*Fee Logic:*
For any amount $A$, the transaction is split into:

* *Owner Amount ($P_o$):* $A \times 0.99$
* *Fee Amount ($P_f$):* $A \times 0.01$

> *Technical Note:* All calculations are performed in *lamports* (for SOL) or *base units* (for USDT) using BigInt to prevent floating-point errors.

***

## 5. Success Metrics

* *Integration Time:* A developer should be able to go from npm install to a working button in < 300 seconds.
* *Transaction Success Rate:* > 98% (excluding user cancellations).
* *Bundle Size:* Keep the final .mjs file under *60kb* (minified).

Do you want to add an "Analytics" feature where the owner can see total tips received through a public dashboard, or should we keep it strictly as a UI component for now?
