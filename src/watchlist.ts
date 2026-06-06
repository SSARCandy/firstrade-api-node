import { FTSession } from "./account";
import * as urls from "./urls";

/**
 * Provides watchlist management for a Firstrade session.
 * 
 * Supports creating and deleting watchlists, adding and removing symbols
 * from watchlists, and retrieving watchlist contents.
 */
export class Watchlist {
  ftSession: FTSession;

  /**
   * Initialize Watchlist with a Firstrade session.
   * @param ftSession An authenticated Firstrade session.
   */
  constructor(ftSession: FTSession) {
    this.ftSession = ftSession;
  }

  /**
   * Retrieve all watchlists for the current user.
   * @returns API response containing a list of watchlists.
   */
  async getWatchlists(): Promise<any> {
    const response = await this.ftSession.request("get", urls.watchlists());
    return response.data;
  }

  /**
   * Create a new watchlist.
   * @param name Display name for the new watchlist.
   * @returns API response containing the ID of the created watchlist.
   */
  async createWatchlist(name: string): Promise<any> {
    const data = new URLSearchParams();
    data.append("name", name);
    const response = await this.ftSession.request("post", urls.watchlists(), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return response.data;
  }

  /**
   * Retrieve the contents of a specific watchlist.
   * @param listId The ID of the watchlist to retrieve.
   * @returns API response containing the watchlist items with each symbol's quote data.
   */
  async getWatchlist(listId: number): Promise<any> {
    const response = await this.ftSession.request("get", urls.watchlist(listId));
    return response.data;
  }

  /**
   * Delete a watchlist.
   * @param listId The ID of the watchlist to delete.
   * @returns API response confirming deletion.
   */
  async deleteWatchlist(listId: number): Promise<any> {
    const response = await this.ftSession.request("delete", urls.watchlist(listId));
    return response.data;
  }

  /**
   * Retrieve every item across all watchlists.
   * @returns API response with all watchlist symbols.
   */
  async getAllWatchlistItems(): Promise<any> {
    const response = await this.ftSession.request("get", urls.watchlistItems());
    return response.data;
  }

  /**
   * Add a symbol to a watchlist.
   * @param listId The ID of the watchlist to add the symbol to.
   * @param symbol The ticker symbol to add.
   * @param secType Security type. "1" for equities/ETFs. Defaults to "1".
   * @returns API response containing the watchlist item ID of the new item.
   */
  async addSymbol(listId: number, symbol: string, secType: string = "1"): Promise<any> {
    const data = new URLSearchParams();
    data.append("symbol", symbol);
    data.append("sec_type", secType);
    const response = await this.ftSession.request("post", urls.watchlistItem(listId), {
      data: data.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return response.data;
  }

  /**
   * Remove a symbol from a watchlist by its watchlist item ID.
   * 
   * Note: watchlistId refers to the per-item ID returned by addSymbol, not the listId of the watchlist itself.
   * 
   * @param watchlistId The item-level watchlist ID to remove.
   * @returns API response confirming deletion.
   */
  async removeSymbol(watchlistId: number): Promise<any> {
    const response = await this.ftSession.request("delete", urls.watchlistItemDelete(watchlistId));
    return response.data;
  }
}
