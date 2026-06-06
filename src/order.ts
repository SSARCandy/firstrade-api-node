import { FTSession } from "./account";
import * as urls from "./urls";

/**
 * Enum for valid price types in an order.
 */
export enum PriceType {
  /** Market order, executed at the current market price. */
  MARKET = "1",
  /** Limit order, executed at a specified price or better. */
  LIMIT = "2",
  /** Stop order, becomes a market order once a specified price is reached. */
  STOP = "3",
  /** Stop-limit order, becomes a limit order once a specified price is reached. */
  STOP_LIMIT = "4",
  /** Trailing stop order with a specified dollar amount. */
  TRAILING_STOP_DOLLAR = "5",
  /** Trailing stop order with a specified percentage. */
  TRAILING_STOP_PERCENT = "6",
}

/**
 * Enum for valid order durations.
 */
export enum Duration {
  /** Day order (9:30 AM - 4 PM ET). */
  DAY = "0",
  /** Day extended order (8 AM - 8 PM ET). */
  DAY_EXT = "D",
  /** Overnight order (8 PM - 4 AM ET). */
  OVERNIGHT = "N",
  /** Good till 90 days order (9:30 AM - 4 PM ET). */
  GT90 = "1",
}

/**
 * Enum for valid order types.
 */
export enum OrderType {
  /** Buy order. */
  BUY = "B",
  /** Sell order. */
  SELL = "S",
  /** Sell short order. */
  SELL_SHORT = "SS",
  /** Buy to cover order. */
  BUY_TO_COVER = "BC",
  /** Buy option order. */
  BUY_OPTION = "BO",
  /** Sell option order. */
  SELL_OPTION = "SO",
}

/**
 * Enum for valid order instructions.
 */
export enum OrderInstructions {
  /** No special instruction. */
  NONE = "0",
  /** All or none. */
  AON = "1",
  /** At the Open. */
  OPG = "4",
  /** At the Close. */
  CLO = "5",
}

/**
 * Enum for valid option types.
 */
export enum OptionType {
  /** Call option. */
  CALL = "C",
  /** Put option. */
  PUT = "P",
}

/**
 * Options for placing an equity order.
 */
export interface PlaceOrderOptions {
  /** The account number to place the order in. */
  account: string;
  /** The ticker symbol for the order. */
  symbol: string;
  /** The price type for the order. */
  priceType: PriceType;
  /** The type of order. */
  orderType: OrderType;
  /** The duration of the order. */
  duration: Duration;
  /** The number of shares to buy or sell. */
  quantity?: number;
  /** The price at which to buy or sell the shares. */
  price?: number;
  /** The stop price for stop orders. */
  stopPrice?: number;
  /** If True, the order will not be placed but will be built and validated. Defaults to True. */
  dryRun?: boolean;
  /** If True, the order will be placed based on a notional dollar amount rather than share quantity. Defaults to False. */
  notional?: boolean;
  /** Additional order instructions (e.g., AON, OPG). */
  orderInstruction?: OrderInstructions;
}

/**
 * Options for placing an option order.
 */
export interface PlaceOptionOrderOptions {
  /** The account number to place the order in. */
  account: string;
  /** The option ticker symbol for the order. */
  optionSymbol: string;
  /** The price type for the order. */
  priceType: PriceType;
  /** The type of order. */
  orderType: OrderType;
  /** The number of option contracts to buy or sell. */
  contracts: number;
  /** The duration of the order. */
  duration: Duration;
  /** The stop price for stop orders. */
  stopPrice?: number;
  /** The price at which to buy or sell the option contracts. */
  price?: number;
  /** If True, the order will not be placed but will be built and validated. Defaults to True. */
  dryRun?: boolean;
  /** Additional order instructions (e.g., AON, OPG). */
  orderInstruction?: OrderInstructions;
}

/**
 * Represents an order with methods to place it.
 */
export class Order {
  ftSession: FTSession;

  /**
   * Initialize the Order with a FirstTrade session.
   * @param ftSession The session object for placing orders.
   */
  constructor(ftSession: FTSession) {
    this.ftSession = ftSession;
  }

  /**
   * Build and place an equity order.
   * @param options The order configuration options.
   * @returns A dictionary containing the order confirmation data.
   */
  async placeOrder(options: PlaceOrderOptions): Promise<any> {
    let {
      account,
      symbol,
      priceType,
      orderType,
      duration,
      quantity = 0,
      price = 0.00,
      stopPrice,
      dryRun = true,
      notional = false,
      orderInstruction = OrderInstructions.NONE,
    } = options;

    if (priceType === PriceType.MARKET && !notional) {
      price = 0; // handled as empty string in payload later
    }
    if (orderInstruction === OrderInstructions.AON && priceType !== PriceType.LIMIT) {
      throw new Error("AON orders must be a limit order.");
    }
    if (orderInstruction === OrderInstructions.AON && quantity <= 100) {
      throw new Error("AON orders must be greater than 100 shares.");
    }

    const data = new URLSearchParams();
    data.append("symbol", symbol);
    data.append("transaction", orderType);
    data.append("duration", duration);
    data.append("preview", "true");
    data.append("instructions", orderInstruction);
    data.append("account", account);
    data.append("price_type", priceType);
    data.append("limit_price", "0");

    if (notional) {
      data.append("dollar_amount", price.toString());
    } else {
      data.append("shares", quantity.toString());
    }

    if (priceType === PriceType.LIMIT || priceType === PriceType.STOP_LIMIT) {
      data.set("limit_price", price.toString());
    } else if (priceType === PriceType.MARKET && !notional) {
      data.set("limit_price", "");
    }
    
    if ((priceType === PriceType.STOP || priceType === PriceType.STOP_LIMIT) && stopPrice !== undefined) {
      data.append("stop_price", stopPrice.toString());
    }

    let response = await this.ftSession.request("post", urls.order(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (response.status !== 200 || response.data.error !== "") {
      return response.data;
    }
    const previewData = response.data;
    if (dryRun) {
      return previewData;
    }

    data.set("preview", "false");
    data.append("stage", "P");
    
    response = await this.ftSession.request("post", urls.order(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return response.data;
  }

  /**
   * Build and place an option order.
   * @param options The option order configuration options.
   * @returns A dictionary containing the order confirmation data.
   */
  async placeOptionOrder(options: PlaceOptionOrderOptions): Promise<any> {
    let {
      account,
      optionSymbol,
      priceType,
      orderType,
      contracts,
      duration,
      stopPrice,
      price = 0.00,
      dryRun = true,
      orderInstruction = OrderInstructions.NONE,
    } = options;

    if (orderInstruction === OrderInstructions.AON && priceType !== PriceType.LIMIT) {
      throw new Error("AON orders must be a limit order.");
    }
    if (orderInstruction === OrderInstructions.AON && contracts <= 100) {
      throw new Error("AON orders must be greater than 100 shares.");
    }

    const data = new URLSearchParams();
    data.append("duration", duration);
    data.append("instructions", orderInstruction);
    data.append("transaction", orderType);
    data.append("contracts", contracts.toString());
    data.append("symbol", optionSymbol);
    data.append("preview", "true");
    data.append("account", account);
    data.append("price_type", priceType);

    if (priceType === PriceType.LIMIT || priceType === PriceType.STOP_LIMIT) {
      data.append("limit_price", price.toString());
    }
    if ((priceType === PriceType.STOP || priceType === PriceType.STOP_LIMIT) && stopPrice !== undefined) {
      data.append("stop_price", stopPrice.toString());
    }

    let response = await this.ftSession.request("post", urls.optionOrder(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (response.status !== 200 || response.data.error !== "") {
      return response.data;
    }
    if (dryRun) {
      return response.data;
    }

    data.set("preview", "false");
    response = await this.ftSession.request("post", urls.optionOrder(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return response.data;
  }
}
