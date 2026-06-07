# Firstrade API Node

![NPM Downloads](https://img.shields.io/npm/d18m/firstrade-api-node)
![NPM License](https://img.shields.io/npm/l/firstrade-api-node)

A Node.js port of the unofficial [Firstrade API](https://github.com/MaxxRK/firstrade-api) Python library. This library provides programmatic access to Firstrade accounts, allowing you to fetch account data, place orders, retrieve stock and option quotes, and manage watchlists.

## Features

- **Authentication:** Secure login support including MFA (Multi-Factor Authentication) via PIN, Email, Phone, or TOTP Secret.
- **Account Management:** Retrieve account balances, positions, transaction history, and recent orders.
- **Market Data:** Fetch real-time quotes, OHLC (Open, High, Low, Close) chart data, and option chain details (including Greeks).
- **Trading:** Place and cancel equity and option orders.
- **Watchlists:** Create, read, update, and delete watchlists and their symbols.

## Installation

```bash
npm install firstrade-api-node
```

## Quick Start

```typescript
import { FTSession, FTAccountData, SymbolQuote } from "firstrade-api-node";

async function run() {
  // 1. Initialize and Login
  const ftSession = new FTSession({
    username: "YOUR_USERNAME",
    password: "YOUR_PASSWORD",
    mfaSecret: "YOUR_TOTP_SECRET",
    // Saves cookies locally to avoid repeated MFA prompts
    saveSession: true,
  });

  const needCode = await ftSession.login();
  if (needCode) {
     // If not using TOTP, handle manual MFA code entry here via ftSession.loginTwo(code)
  }

  // 2. Fetch Account Data
  const ftAccounts = new FTAccountData(ftSession);
  await ftAccounts.init();
  
  const accountId = ftAccounts.accountNumbers[0];
  console.log(`Using Account: ${accountId}`);

  // Fetch balance overview (Cash, Buying Power, Equity, etc.)
  const balanceOverview = await ftAccounts.getBalanceOverview(accountId);
  console.log("Cash Balance:", balanceOverview["result.cash_balance"]);

  // Fetch current positions
  const positions = await ftAccounts.getPositions(accountId);
  console.log("Positions:", positions.items.map((p: any) => `${p.quantity}x ${p.symbol}`).join(", "));

  // 3. Fetch Market Data
  const quote = await SymbolQuote.create(ftSession, accountId, "AAPL");
  console.log(`AAPL Last Price: $${quote.last}`);
}

run().catch(console.error);
```

## Documentation

Full API documentation is available online at [https://ssarcandy.tw/firstrade-api-node/](https://ssarcandy.tw/firstrade-api-node/).

You can also generate it locally by running `npm run docs` and opening `docs/index.html` in your browser. 

## Disclaimer

This is an **unofficial** API wrapper. It is not endorsed by or affiliated with Firstrade Securities Inc. Use at your own risk. The authors are not responsible for any financial losses or account bans resulting from the use of this software.
