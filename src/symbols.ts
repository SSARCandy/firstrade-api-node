import { FTSession } from "./account";
import * as urls from "./urls";
import { QuoteRequestError, QuoteResponseError } from "./exceptions";

/**
 * Data class representing a stock quote for a given symbol.
 */
export class SymbolQuote {
  ftSession: FTSession;
  symbol: string;
  secType: string;
  tick: string;
  bid: string;
  bidSize: string;
  ask: string;
  askSize: string;
  last: string;
  change: string;
  high: string;
  low: string;
  bidMmid: string;
  askMmid: string;
  lastMmid: string;
  lastSize: number;
  changeColor: string;
  volume: string;
  todayClose: number;
  open: string;
  quoteTime: string;
  lastTradeTime: string;
  companyName: string;
  exchange: string;
  hasOption: string;
  isEtf: boolean;
  isFractional: boolean;
  realtime: string;
  nls: string;
  shares: string;

  private constructor(ftSession: FTSession, data: any) {
    this.ftSession = ftSession;
    this.symbol = data.symbol;
    this.secType = data.sec_type;
    this.tick = data.tick;
    this.bid = data.bid;
    this.bidSize = data.bid_size;
    this.ask = data.ask;
    this.askSize = data.ask_size;
    this.last = data.last;
    this.change = data.change;
    this.high = data.high;
    this.low = data.low;
    this.bidMmid = data.bid_mmid;
    this.askMmid = data.ask_mmid;
    this.lastMmid = data.last_mmid;
    this.lastSize = data.last_size;
    this.changeColor = data.change_color;
    this.volume = data.vol;
    this.todayClose = data.today_close;
    this.open = data.open;
    this.quoteTime = data.quote_time;
    this.lastTradeTime = data.last_trade_time;
    this.companyName = data.company_name;
    this.exchange = data.exchange;
    this.hasOption = data.has_option;
    this.isEtf = Boolean(data.is_etf);
    this.isFractional = Boolean(data.is_fractional);
    this.realtime = data.realtime;
    this.nls = data.nls;
    this.shares = data.shares;
  }

  /**
   * Initialize a new instance of the SymbolQuote class.
   * @param ftSession The session object used for making HTTP requests to Firstrade.
   * @param account The account number for which the quote information is retrieved.
   * @param symbol The symbol for which the quote information is retrieved.
   * @returns A Promise resolving to a SymbolQuote instance.
   * @throws {QuoteRequestError} If the quote request fails.
   * @throws {QuoteResponseError} If the quote response contains an error message.
   */
  static async create(ftSession: FTSession, account: string, symbol: string): Promise<SymbolQuote> {
    const response = await ftSession.request("get", urls.quote(account, symbol));
    if (response.status !== 200) {
      throw new QuoteRequestError(response.status);
    }
    if (response.data.error) {
      throw new QuoteResponseError(symbol, response.data.error);
    }
    return new SymbolQuote(ftSession, response.data.result);
  }
}

/**
 * Data class representing an option quote for a given symbol.
 */
export class OptionQuote {
  ftSession: FTSession;
  symbol: string;

  /**
   * Initialize a new instance of the OptionQuote class.
   * @param ftSession The session object used for making HTTP requests to Firstrade.
   * @param symbol The symbol for which the option quote information is retrieved.
   */
  constructor(ftSession: FTSession, symbol: string) {
    this.ftSession = ftSession;
    this.symbol = symbol;
  }

  /**
   * Retrieve the expiration dates for options on a given symbol.
   * @returns A Promise resolving to a dict of expiration dates and other information.
   */
  async getOptionDates(): Promise<any> {
    const response = await this.ftSession.request("get", urls.optionDates(this.symbol));
    return response.data;
  }

  /**
   * Retrieve the quote for a given option symbol.
   * @param date The expiration date of the options.
   * @returns A Promise resolving to a dictionary containing the quote and other information.
   */
  async getOptionQuote(date: string): Promise<any> {
    const response = await this.ftSession.request("get", urls.optionQuotes(this.symbol, date));
    return response.data;
  }

  /**
   * Retrieve the greeks for options on a given symbol.
   * @param expDate The expiration date of the options.
   * @returns A Promise resolving to a dictionary containing the greeks.
   */
  async getGreekOptions(expDate: string): Promise<any> {
    const data = new URLSearchParams();
    data.append("type", "chain");
    data.append("chains_range", "A");
    data.append("root_symbol", this.symbol);
    data.append("exp_date", expDate);

    const response = await this.ftSession.request("post", urls.greekOptions(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return response.data;
  }
}

/**
 * Data class representing OHLC (Open, High, Low, Close) price data for a given symbol.
 */
export class SymbolOHLC {
  ftSession: FTSession;
  symbol: string;
  range: string;
  startOfDay?: number;
  ohlcRaw: any[];
  volRaw: any[];
  /** A list of parsed OHLC candles in the format: [timestamp_ms, open, high, low, close, volume] */
  candles: Array<[number, number, number, number, number, number]>;

  private constructor(ftSession: FTSession, symbol: string, range: string, data: any) {
    this.ftSession = ftSession;
    this.symbol = symbol;
    this.range = range;

    const result = data.result;
    this.startOfDay = result.startOfDay;
    this.ohlcRaw = result.ohlc;
    this.volRaw = result.vol || [];
    this.candles = [];

    this.parseOhlcAndVolume();
  }

  /**
   * Initialize a new instance of the SymbolOHLC class.
   * @param ftSession The session object used for making HTTP requests to Firstrade.
   * @param symbol The symbol for which OHLC data is retrieved.
   * @param range The time range for the OHLC data (e.g., 24h, 1d, 1w, 1m, 1y).
   * @returns A Promise resolving to a SymbolOHLC instance.
   * @throws {QuoteRequestError} If the OHLC request fails.
   * @throws {QuoteResponseError} If the OHLC response contains an error message.
   */
  static async create(ftSession: FTSession, symbol: string, range: string = "1d"): Promise<SymbolOHLC> {
    const response = await ftSession.request("get", urls.ohlc(symbol, range));
    if (response.status !== 200) {
      throw new QuoteRequestError(response.status);
    }
    if (response.data.error) {
      throw new QuoteResponseError(symbol, response.data.error);
    }
    return new SymbolOHLC(ftSession, symbol, range, response.data);
  }

  private parseOhlcAndVolume() {
    const volumeMap = new Map<number, number>();
    for (const [ts, vol] of this.volRaw) {
      volumeMap.set(ts, vol);
    }

    for (const entry of this.ohlcRaw) {
      const timestamp = entry[0];
      const open = entry[1];
      const high = entry[2];
      const low = entry[3];
      const close = entry[4];
      
      let volume: number;
      if (volumeMap.has(timestamp)) {
        volume = volumeMap.get(timestamp)!;
      } else if (entry.length === 6) {
        volume = entry[5];
      } else {
        throw new Error(`Missing volume for timestamp ${timestamp}`);
      }

      this.candles.push([timestamp, open, high, low, close, volume]);
    }
  }
}
