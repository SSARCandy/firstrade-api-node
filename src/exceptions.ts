/**
 * Base class for exceptions in the Quote module.
 */
export class QuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteError";
  }
}

/**
 * Exception raised for errors in the HTTP request during a Quote.
 */
export class QuoteRequestError extends QuoteError {
  statusCode: number;

  constructor(statusCode: number, message = "Error in HTTP request") {
    super(`${message}. HTTP status code: ${statusCode}`);
    this.name = "QuoteRequestError";
    this.statusCode = statusCode;
  }
}

/**
 * Exception raised for errors in the API response.
 */
export class QuoteResponseError extends QuoteError {
  symbol: string;

  constructor(symbol: string, errorMessage: string) {
    super(`Failed to get data for ${symbol}. API returned the following error: ${errorMessage}`);
    this.name = "QuoteResponseError";
    this.symbol = symbol;
  }
}

/**
 * Exception raised for errors in the login process.
 */
export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginError";
  }
}

/**
 * Exception raised for errors in the HTTP request during login.
 */
export class LoginRequestError extends LoginError {
  statusCode: number;

  constructor(statusCode: number, message = "Error in HTTP request during login") {
    super(`${message}. HTTP status code: ${statusCode}`);
    this.name = "LoginRequestError";
    this.statusCode = statusCode;
  }
}

/**
 * Exception raised for errors in the API response during login.
 */
export class LoginResponseError extends LoginError {
  constructor(errorMessage: string) {
    super(`Failed to login. API returned the following error: ${errorMessage}`);
    this.name = "LoginResponseError";
  }
}

/**
 * Base class for exceptions in the Account module.
 */
export class AccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountError";
  }
}

/**
 * Exception raised for errors in the API response when getting account data.
 */
export class AccountResponseError extends AccountError {
  constructor(errorMessage: string) {
    super(`Failed to get account data. API returned the following error: ${errorMessage}`);
    this.name = "AccountResponseError";
  }
}
