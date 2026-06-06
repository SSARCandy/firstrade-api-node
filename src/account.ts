import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { CookieJar } from "tough-cookie";
import * as otpauth from "otpauth";
import * as fs from "node:fs";
import * as path from "node:path";

import * as urls from "./urls";
import {
  LoginError,
  LoginRequestError,
  LoginResponseError,
  AccountResponseError,
} from "./exceptions";

/**
 * Options for configuring a Firstrade session.
 */
export interface FTSessionOptions {
  /** Firstrade login username. */
  username?: string;
  /** Firstrade login password. */
  password?: string;
  /** Firstrade login pin. */
  pin?: string;
  /** Firstrade MFA email. */
  email?: string;
  /** Firstrade MFA phone number. */
  phone?: string;
  /** Secret key for generating MFA codes. */
  mfaSecret?: string;
  /** The path where the user wants to save the cookie file. */
  profilePath?: string;
  /** Save session cookies if true. */
  saveSession?: boolean;
  /** Log HTTP requests/responses if true. */
  debug?: boolean;
}

/**
 * Class creating a session for Firstrade.
 * 
 * This class handles the creation and management of a session for logging into the Firstrade platform.
 * It supports multi-factor authentication (MFA) and can save session cookies for persistent logins.
 */
export class FTSession {
  username: string;
  password?: string;
  pin?: string;
  email?: string;
  phone?: string;
  mfaSecret?: string;
  profilePath?: string;
  saveSession: boolean;
  debug: boolean;

  tToken?: string;
  otpOptions?: any[];
  loginJson: any = {};
  session: AxiosInstance;
  cookieJar: CookieJar;

  /**
   * Initializes a new instance of the FTSession class.
   * @param options FTSession configuration options.
   */
  constructor(options: FTSessionOptions = {}) {
    this.username = options.username || "";
    this.password = options.password || "";
    this.pin = options.pin || "";
    this.email = options.email ? FTSession.maskEmail(options.email) : "";
    this.phone = options.phone || "";
    this.mfaSecret = options.mfaSecret || "";
    this.profilePath = options.profilePath;
    this.saveSession = options.saveSession || false;
    this.debug = options.debug || false;

    this.cookieJar = new CookieJar();
    this.session = axios.create({
      withCredentials: true,
      headers: urls.sessionHeaders(),
    });

    this.session.interceptors.request.use(async (config) => {
      const urlStr = config.url || "https://api3x.firstrade.com/";
      const cookieStr = await this.cookieJar.getCookieString(urlStr);
      if (cookieStr) {
        config.headers.Cookie = cookieStr;
      }
      if (this.debug) {
        console.log(`>>> ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    });

    this.session.interceptors.response.use(async (res) => {
      const urlStr = res.config.url || "https://api3x.firstrade.com/";
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        for (const c of setCookie) {
          await this.cookieJar.setCookie(c, urlStr);
        }
      }
      if (this.debug) {
        console.log(`<<< Status: ${res.status}`);
      }
      return res;
    }, (error) => {
      if (this.debug && error.response) {
        console.log(`<<< Status: ${error.response.status}`);
      }
      return Promise.reject(error);
    });
  }

  /**
   * Validate and log into the Firstrade platform.
   * 
   * @returns True if further MFA action is required, otherwise false.
   * @throws {LoginRequestError} If the login request fails.
   * @throws {LoginResponseError} If the API returns an error.
   */
  async login(): Promise<boolean> {
    const ftat = this.loadCookies();
    if (ftat) {
      this.session.defaults.headers.common["ftat"] = ftat;
    }

    await this.request("get", "https://api3x.firstrade.com/");
    this.session.defaults.headers.common["access-token"] = urls.accessToken();

    const data = new URLSearchParams();
    data.append("username", this.username);
    if (this.password) data.append("password", this.password);

    let response: AxiosResponse;
    try {
      response = await this.request("post", urls.login(), {
        data: data.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
    } catch (error: any) {
      if (error.response) {
        response = error.response;
      } else {
        throw new LoginResponseError("Invalid response or network error");
      }
    }

    try {
      this.loginJson = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
    } catch (exc) {
      throw new LoginResponseError("Invalid JSON is your account funded?");
    }

    if (!("mfa" in this.loginJson) && "ftat" in this.loginJson && !this.loginJson.error) {
      this.session.defaults.headers.common["sid"] = this.loginJson.sid;
      return false;
    }

    this.tToken = this.loginJson.t_token;
    if (!this.loginJson.mfa) {
      this.otpOptions = this.loginJson.otp;
    }

    if (response.status !== 200) {
      throw new LoginRequestError(response.status);
    }
    if (this.loginJson.error) {
      throw new LoginResponseError(this.loginJson.error);
    }

    const needCode = await this.handleMfa();

    if (this.loginJson.error) {
      throw new LoginResponseError(this.loginJson.error);
    }

    if (needCode) {
      return true;
    }

    this.session.defaults.headers.common["ftat"] = this.loginJson.ftat;
    this.session.defaults.headers.common["sid"] = this.loginJson.sid;

    if (this.saveSession) {
      this.saveCookies();
    }
    return false;
  }

  /**
   * Finish the login process to the Firstrade platform when using email or phone MFA.
   * @param code The MFA code provided by the user.
   */
  async loginTwo(code: string): Promise<void> {
    const data = new URLSearchParams();
    if (this.loginJson.mfa) {
      data.append("mfaCode", code);
      data.append("remember_for", "30");
      if (this.tToken) data.append("t_token", this.tToken);
    } else {
      data.append("otpCode", code);
      const sid = this.session.defaults.headers.common["sid"] as string;
      if (sid) data.append("verificationSid", sid);
      data.append("remember_for", "30");
      if (this.tToken) data.append("t_token", this.tToken);
    }

    const response = await this.request("post", urls.verifyPin(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    this.loginJson = response.data;
    if (this.loginJson.error) {
      throw new LoginResponseError(this.loginJson.error);
    }

    this.session.defaults.headers.common["ftat"] = this.loginJson.ftat;
    this.session.defaults.headers.common["sid"] = this.loginJson.sid;

    if (this.saveSession) {
      this.saveCookies();
    }
  }

  /**
   * Deletes the session cookies.
   */
  deleteCookies(): void {
    const filename = `ft_cookies${this.username}.json`;
    const filepath = this.profilePath ? path.join(this.profilePath, filename) : filename;
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  /**
   * Returns the current session tokens (access_token, ftat, sid and cookies).
   */
  async getTokens(): Promise<Record<string, any>> {
    const cookiesStr = await this.cookieJar.getCookieString("https://api3x.firstrade.com");
    return {
      "access-token": this.session.defaults.headers.common["access-token"],
      "ftat": this.session.defaults.headers.common["ftat"],
      "sid": this.session.defaults.headers.common["sid"],
      "cookies": cookiesStr,
    };
  }

  /**
   * Builds the session headers and cookies from provided tokens.
   */
  async buildSessionFromTokens(tokens: Record<string, any>): Promise<void> {
    if (tokens["access-token"]) this.session.defaults.headers.common["access-token"] = tokens["access-token"];
    if (tokens["ftat"]) this.session.defaults.headers.common["ftat"] = tokens["ftat"];
    if (tokens["sid"]) this.session.defaults.headers.common["sid"] = tokens["sid"];
    
    if (tokens["cookies"] && typeof tokens["cookies"] === "string") {
      const parts = tokens["cookies"].split(";");
      for (const part of parts) {
        if (part.trim()) {
          await this.cookieJar.setCookie(part.trim(), "https://api3x.firstrade.com");
        }
      }
    }
  }

  private loadCookies(): string | null {
    const filename = `ft_cookies${this.username}.json`;
    const directory = this.profilePath || ".";
    const filepath = path.join(directory, filename);

    if (fs.existsSync(filepath)) {
      try {
        const content = fs.readFileSync(filepath, "utf-8");
        return JSON.parse(content);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  private saveCookies(): void {
    if (!this.saveSession) return;
    const filename = `ft_cookies${this.username}.json`;
    const directory = this.profilePath || ".";
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    const filepath = path.join(directory, filename);
    const ftat = this.session.defaults.headers.common["ftat"];
    fs.writeFileSync(filepath, JSON.stringify(ftat));
  }

  /**
   * Masks the email for use in the API.
   * @param email The email address to be masked.
   * @returns The masked email address.
   */
  static maskEmail(email: string): string {
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const local = parts[0];
    const domain = parts[1];
    const maskedLocal = local[0] + "****";
    const domainParts = domain.split(".");
    if (domainParts.length < 2) return `${maskedLocal}@${domain}`;
    const domainName = domainParts[0];
    const tld = domainParts.slice(1).join(".");
    const maskedDomain = domainName[0] + "****";
    return `${maskedLocal}@${maskedDomain}.${tld}`;
  }

  private async handleMfa(): Promise<boolean> {
    let response: AxiosResponse;
    const data = new URLSearchParams();

    if (this.pin) {
      response = await this.handlePinMfa(data);
      this.loginJson = response.data;
    } else if ((this.email || this.phone) && !this.loginJson.mfa) {
      response = await this.handleOtpMfa(data);
      this.loginJson = response.data;
    } else if (this.mfaSecret) {
      response = await this.handleSecretMfa(data);
      this.loginJson = response.data;
    } else if (this.loginJson.mfa) {
      // handled in loginTwo
    } else {
      throw new LoginError("MFA required but no valid MFA method was provided (pin, email/phone, or mfa_secret).");
    }

    if (this.loginJson.error) {
      throw new LoginResponseError(this.loginJson.error);
    }

    if (this.pin || this.mfaSecret) {
      this.session.defaults.headers.common["sid"] = this.loginJson.sid;
      return false;
    }

    if (this.loginJson.mfa && !this.mfaSecret) {
      return true;
    }

    this.session.defaults.headers.common["sid"] = this.loginJson.verificationSid;
    return true;
  }

  private async handlePinMfa(data: URLSearchParams): Promise<AxiosResponse> {
    data.append("pin", this.pin!);
    data.append("remember_for", "30");
    if (this.tToken) data.append("t_token", this.tToken);
    return this.request("post", urls.verifyPin(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
  }

  private async handleOtpMfa(data: URLSearchParams): Promise<AxiosResponse> {
    if (!this.otpOptions) {
      throw new LoginResponseError("No OTP options available.");
    }

    let matched = false;
    for (const item of this.otpOptions) {
      if ((item.channel === "sms" && this.phone && this.phone.includes(item.recipientMask)) ||
          (item.channel === "email" && this.email && this.email === item.recipientMask)) {
        data.append("recipientId", item.recipientId);
        if (this.tToken) data.append("t_token", this.tToken);
        matched = true;
        break;
      }
    }
    
    if (!matched && this.otpOptions.length > 0) {
      // Fallback to first if no exact match but requested
      data.append("recipientId", this.otpOptions[0].recipientId);
      if (this.tToken) data.append("t_token", this.tToken);
    }

    return this.request("post", urls.requestCode(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
  }

  private async handleSecretMfa(data: URLSearchParams): Promise<AxiosResponse> {
    const totp = new otpauth.TOTP({
      secret: otpauth.Secret.fromBase32(this.mfaSecret!),
    });
    const mfaOtp = totp.generate();
    data.append("mfaCode", mfaOtp);
    data.append("remember_for", "30");
    if (this.tToken) data.append("t_token", this.tToken);
    return this.request("post", urls.verifyPin(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
  }

  /**
   * HTTP requests wrapper to the API.
   */
  public async request(method: string, url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.session.request({ method, url, ...config });
  }
}

/**
 * Class for storing account information.
 */
export class FTAccountData {
  session: FTSession;
  allAccounts: any[] = [];
  accountNumbers: string[] = [];
  accountBalances: Record<string, any> = {};
  userInfo: any = {};

  /**
   * Initialize a new instance of the FTAccountData class.
   * @param session The session object used for making HTTP requests.
   */
  constructor(session: FTSession) {
    this.session = session;
  }

  /**
   * Initialize account data by fetching user info and account list.
   */
  async init(): Promise<void> {
    let response = await this.session.request("get", urls.userInfo());
    this.userInfo = response.data;

    response = await this.session.request("get", urls.accountList());
    if (response.status !== 200 || response.data.error) {
      throw new AccountResponseError(response.data.error);
    }
    
    this.allAccounts = response.data;
    if (this.allAccounts && (this.allAccounts as any).items) {
      for (const item of (this.allAccounts as any).items) {
        this.accountNumbers.push(item.account);
        this.accountBalances[item.account] = item.total_value;
      }
    }
  }

  /**
   * Get account balances for a given account.
   * @param account Account number of the account you want to get balances for.
   * @returns Response from the API.
   */
  async getAccountBalances(account: string): Promise<any> {
    const response = await this.session.request("get", urls.accountBalances(account));
    return response.data;
  }

  /**
   * Get currently held positions for a given account.
   * @param account Account number of the account you want to get positions for.
   * @returns Response from the API.
   */
  async getPositions(account: string): Promise<any> {
    const response = await this.session.request("get", urls.accountPositions(account));
    return response.data;
  }

  /**
   * Get account history for a given account.
   * @param account Account number of the account you want to get history for.
   * @param dateRange The range of the history. Defaults to "ytd".
   * @param customRange The custom range of the history format `[YYYY-MM-DD, YYYY-MM-DD]`. Required if dateRange is "cust".
   * @returns Response from the API.
   */
  async getAccountHistory(account: string, dateRange: string = "ytd", customRange?: [string, string]): Promise<any> {
    if (dateRange === "cust" && !customRange) {
      throw new Error("Custom range required.");
    }
    const response = await this.session.request("get", urls.accountHistory(account, dateRange, customRange));
    return response.data;
  }

  /**
   * Retrieve existing order data for a given account.
   * @param account Account number of the account to retrieve orders for.
   * @param perPage Number of orders to retrieve per page. Defaults to 0 (all orders).
   * @returns Response from the API.
   */
  async getOrders(account: string, perPage: number = 0): Promise<any> {
    const response = await this.session.request("get", urls.orderList(account, perPage));
    return response.data;
  }

  /**
   * Cancel an existing order.
   * @param orderId The order ID to cancel.
   * @returns Response from the API.
   */
  async cancelOrder(orderId: string): Promise<any> {
    const data = new URLSearchParams();
    data.append("order_id", orderId);
    const response = await this.session.request("post", urls.cancelOrder(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return response.data;
  }

  /**
   * Return a filtered, flattened view of useful balance fields.
   * 
   * @param account Account number to query balances for.
   * @param keywords Additional case-insensitive substrings to match in keys.
   * @returns A dict mapping dot-notated keys to values from the balances response.
   */
  async getBalanceOverview(account: string, keywords?: string[]): Promise<Record<string, any>> {
    const keys = keywords || ["cash", "avail", "withdraw", "buying", "bp", "equity", "value", "margin"];
    const payload = await this.getAccountBalances(account);
    const filtered: Record<string, any> = {};

    const walk = (node: any, path: string[]) => {
      if (node !== null && typeof node === "object" && !Array.isArray(node)) {
        for (const [k, v] of Object.entries(node)) {
          walk(v, [...path, k]);
        }
      } else if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          walk(node[i], [...path, i.toString()]);
        }
      } else {
        const keyPath = path.join(".");
        const low = keyPath.toLowerCase();
        if (keys.some(sub => low.includes(sub))) {
          filtered[keyPath] = node;
        }
      }
    };

    walk(payload, []);
    return filtered;
  }
}
