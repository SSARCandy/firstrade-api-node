import { FTSession, FTAccountData, Order, SymbolQuote, SymbolOHLC, Watchlist, PriceType, OrderType, Duration } from "./src";
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  const configPath = path.join(__dirname, "config.json");
  let config = { username: "", password: "", mfaSecret: "" };

  if (fs.existsSync(configPath)) {
    const rawData = fs.readFileSync(configPath, "utf-8");
    config = JSON.parse(rawData);
  } else {
    console.warn("No config.json found. Create one with username, password, and mfaSecret.");
    process.exit(1);
  }

  // Create a session
  // saveSession flag required to save cookies json file
  const ftSession = new FTSession({
    username: config.username,
    password: config.password,
    mfaSecret: config.mfaSecret,
    saveSession: true
  });

  const needCode = await ftSession.login();
  if (needCode) {
    // If using email/phone MFA, you would prompt the user for the code here:
    // const code = prompt("Please enter the pin sent to your email/phone: ");
    // await ftSession.loginTwo(code);
  }

  // Get account data
  const ftAccounts = new FTAccountData(ftSession);
  await ftAccounts.init();

  if (ftAccounts.accountNumbers.length < 1) {
    throw new Error("No accounts found or an error occurred exiting...");
  }

  console.log(`Account data:`, JSON.stringify(ftAccounts.allAccounts, null, 2));
  console.log(`1st account number: ${ftAccounts.accountNumbers[0]}`);
  console.log(`Account(s) current balance(s):`, ftAccounts.accountBalances);

  // Get and print cash balance overview
  const balanceOverview = await ftAccounts.getBalanceOverview(ftAccounts.accountNumbers[0]);
  console.log(`Cash Balance Overview for account ${ftAccounts.accountNumbers[0]}:`, JSON.stringify(balanceOverview, null, 2));

  // Get quote for INTC
  const quote = await SymbolQuote.create(ftSession, ftAccounts.accountNumbers[0], "INTC");
  console.log("Quote for INTC:");
  console.log(`\tSymbol: ${quote.symbol}`);
  console.log(`\tTick: ${quote.tick}`);
  console.log(`\tExchange: ${quote.exchange}`);
  console.log(`\tBid: ${quote.bid}`);
  console.log(`\tAsk: ${quote.ask}`);
  console.log(`\tLast: ${quote.last}`);

  // Get positions and print them out for an account.
  const positions = await ftAccounts.getPositions(ftAccounts.accountNumbers[0]);
  console.log(`Current positions held in account ${ftAccounts.accountNumbers[0]}:`, JSON.stringify(positions, null, 2));

  // Get account history for a custom date range
  const history = await ftAccounts.getAccountHistory(
    ftAccounts.accountNumbers[0],
    "cust",
    ["2025-12-01", "2025-12-31"]
  );
  console.log(`Transaction history (December 2025) for account #${ftAccounts.accountNumbers[0]}:`, JSON.stringify(history, null, 2));

  // Create an order object.
  const ftOrder = new Order(ftSession);

  // Place a real order and print out order confirmation data.
  const orderConf = await ftOrder.placeOrder({
    account: ftAccounts.accountNumbers[0],
    symbol: "INTC",
    priceType: PriceType.LIMIT,
    orderType: OrderType.BUY,
    duration: Duration.DAY,
    quantity: 1,
    price: 3.37,
    dryRun: false,
  });
  console.log(`Placed order to buy 1 share of INTC:`, JSON.stringify(orderConf, null, 2));

  if (orderConf.error) {
    console.log(`Error placing order: ${orderConf.error}`);
  } else if (!orderConf.result || !orderConf.result.order_id) {
    console.log("Dry run complete!");
  } else {
    console.log("Order placed successfully!");
    console.log(`\tOrder ID: ${orderConf.result.order_id}`);
    
    // Cancel placed order
    const cancel = await ftAccounts.cancelOrder(orderConf.result.order_id);
    if (cancel.result && cancel.result.result === "success") {
      console.log(`Order cancelled successfully:`, JSON.stringify(cancel));
    } else {
      console.log(`Cannot cancel order:`, JSON.stringify(cancel));
    }
  }

  // Retrieve OHLC data
  const ohlc = await SymbolOHLC.create(ftSession, "INTC", "1y");
  console.log(`Open-high-low-close chart data for INTC (first two values):`, ohlc.candles.slice(0, 2));

  // Check orders
  const recentOrders = await ftAccounts.getOrders(ftAccounts.accountNumbers[0], 5);
  console.log(`Recent orders:`, JSON.stringify(recentOrders, null, 2));

  // Watchlists
  const wl = new Watchlist(ftSession);
  const data = await wl.getWatchlists();
  console.log("Watchlist(s):", data);

  // Delete the session cookie
  // ftSession.deleteCookies();
}

main().catch(console.error);
