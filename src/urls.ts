/**
 * Login URL for FirstTrade API.
 */
export function login(): string {
  return "https://api3x.firstrade.com/sess/login";
}

/**
 * Request PIN/MFA option for FirstTrade API.
 */
export function requestCode(): string {
  return "https://api3x.firstrade.com/sess/request_code";
}

/**
 * Request PIN/MFA verification for FirstTrade API.
 */
export function verifyPin(): string {
  return "https://api3x.firstrade.com/sess/verify_pin";
}

/**
 * Retrieve user information URL for FirstTrade API.
 */
export function userInfo(): string {
  return "https://api3x.firstrade.com/private/userinfo";
}

/**
 * Retrieve account list URL for FirstTrade API.
 */
export function accountList(): string {
  return "https://api3x.firstrade.com/private/acct_list";
}

/**
 * Retrieve account balances URL for FirstTrade API.
 */
export function accountBalances(account: string): string {
  return `https://api3x.firstrade.com/private/balances?account=${account}`;
}

/**
 * Retrieve account positions URL for FirstTrade API.
 */
export function accountPositions(account: string): string {
  return `https://api3x.firstrade.com/private/positions?account=${account}&per_page=200`;
}

/**
 * Symbol quote URL for FirstTrade API.
 */
export function quote(account: string, symbol: string): string {
  return `https://api3x.firstrade.com/public/quote?account=${account}&q=${symbol}`;
}

/**
 * Open-high-low-close chart data URL for FirstTrade API.
 */
export function ohlc(symbol: string, range: string): string {
  return `https://api3x.firstrade.com/public/ohlc?symbol=${symbol}&range=${range}&_v=v2`;
}

/**
 * Place equity order URL for FirstTrade API.
 */
export function order(): string {
  return "https://api3x.firstrade.com/private/stock_order";
}

/**
 * Retrieve placed order list URL for FirstTrade API.
 */
export function orderList(account: string, perPage: number = 0): string {
  if (perPage === 0) {
    return `https://api3x.firstrade.com/private/order_status?account=${account}`;
  }
  return `https://api3x.firstrade.com/private/order_status?account=${account}&per_page=${perPage}`;
}

/**
 * Retrieve account history URL for FirstTrade API.
 */
export function accountHistory(account: string, dateRange: string, customRange?: [string, string]): string {
  if (!customRange) {
    return `https://api3x.firstrade.com/private/account_history?range=${dateRange}&page=1&account=${account}&per_page=1000`;
  }
  return `https://api3x.firstrade.com/private/account_history?range=${dateRange}&range_arr[]=${customRange[0]}&range_arr[]=${customRange[1]}&page=1&account=${account}&per_page=1000`;
}

/**
 * Cancel placed order URL for FirstTrade API.
 */
export function cancelOrder(): string {
  return "https://api3x.firstrade.com/private/cancel_order";
}

/**
 * Option dates URL for FirstTrade API.
 */
export function optionDates(symbol: string): string {
  return `https://api3x.firstrade.com/public/oc?m=get_exp_dates&root_symbol=${symbol}`;
}

/**
 * Option quotes URL for FirstTrade API.
 */
export function optionQuotes(symbol: string, date: string): string {
  return `https://api3x.firstrade.com/public/oc?m=get_oc&root_symbol=${symbol}&exp_date=${date}&chains_range=A`;
}

/**
 * Greek options analytical data URL for FirstTrade API.
 */
export function greekOptions(): string {
  return "https://api3x.firstrade.com/private/greekoptions/analytical";
}

/**
 * Place option order URL for FirstTrade API.
 */
export function optionOrder(): string {
  return "https://api3x.firstrade.com/private/option_order";
}

/**
 * Watchlist collection URL for FirstTrade API (list all / create).
 */
export function watchlists(): string {
  return "https://api3x.firstrade.com/private/watchlists";
}

/**
 * Single watchlist URL for FirstTrade API (get / delete).
 */
export function watchlist(listId: number): string {
  return `https://api3x.firstrade.com/private/watchlists/${listId}`;
}

/**
 * All watchlist items URL for FirstTrade API.
 */
export function watchlistItems(): string {
  return "https://api3x.firstrade.com/private/all_watchlist_items";
}

/**
 * Add item to watchlist URL for FirstTrade API.
 */
export function watchlistItem(listId: number): string {
  return `https://api3x.firstrade.com/private/watchlist/${listId}`;
}

/**
 * Delete a single watchlist item URL for FirstTrade API.
 */
export function watchlistItemDelete(watchlistId: number): string {
  return `https://api3x.firstrade.com/private/watchlist/${watchlistId}`;
}

/**
 * Session headers for FirstTrade API.
 */
export function sessionHeaders(): Record<string, string> {
  return {
    "Accept-Encoding": "gzip",
    "Connection": "Keep-Alive",
    "Host": "api3x.firstrade.com",
    "User-Agent": "okhttp/4.9.2",
  };
}

/**
 * Access token for FirstTrade API.
 */
export function accessToken(): string {
  return "833w3XuIFycv18ybi";
}
