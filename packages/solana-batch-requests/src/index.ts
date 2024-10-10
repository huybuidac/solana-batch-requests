import {
  GetMultipleAccountsConfig,
  PublicKey,
  type AccountInfo,
  type Connection,
  type ParsedAccountData,
} from '@solana/web3.js';
import groupBy from 'lodash/groupBy';
import map from 'lodash/map';
import omit from 'lodash/omit';
import { from, Subject, Subscription, timer } from 'rxjs';
import { buffer, bufferCount, bufferTime, mergeMap, takeUntil, throttle } from 'rxjs/operators';

/**
 * Configuration options for Solana batch requests.
 */
export interface SolanaBatchRequestsConfig {
  /**
   * The maximum number of accounts to include in a single batch request.
   * If not specified, defaults to 100.
   */
  maximumBatchSize?: number;

  /**
   * The time window (in milliseconds) to wait before sending a batch request.
   * This allows multiple requests to be grouped together within this time frame.
   * If not specified, defaults to 500 milliseconds.
   */
  timeWindow?: number;

  /**
   * Configuration options for the getMultipleParsedAccounts method.
   * This can include options such as commitment level.
   */
  getAccountConfig?: GetMultipleAccountsConfig;
}

interface QueryItem {
  account: String;
  resolve: (account: AccountInfo<Buffer | ParsedAccountData> | null) => void;
  reject: (error: unknown) => void;
}

const queryConfigs = new Map<string, ConnectionSubject<QueryItem>>();
const $unsubscribe = new Subject<void>();
const subscriptions: Subscription[] = [];

let batchConfig: SolanaBatchRequestsConfig = {
  maximumBatchSize: 100,
  timeWindow: 500,
  getAccountConfig: undefined,
};

function getSubject(connection: Connection, replaceConnection = true) {
  let config = queryConfigs.get(connection.rpcEndpoint);
  if (!config) {
    config = new ConnectionSubject<QueryItem>(connection);
    queryConfigs.set(connection.rpcEndpoint, config);
    config
      .pipe(
        takeUntil($unsubscribe),
        bufferTime(batchConfig.timeWindow || 500),
        mergeMap((items) => from(items).pipe(bufferCount(batchConfig.maximumBatchSize || 100)))
      )
      .subscribe(async (items) => {
        const groupedAccounts = groupBy(items, (item) => item.account);
        const accountCallbacks = map(groupedAccounts, (items, account) => ({
          account,
          callbacks: items.map((item) => omit(item, ['account'])),
        }));

        try {
          const res = await connection.getMultipleParsedAccounts(
            items.map((item) => new PublicKey(item.account)),
            batchConfig.getAccountConfig
          );

          accountCallbacks.forEach(({ callbacks }, index) => {
            const result = res.value?.[index];
            callbacks.forEach(({ resolve }) => resolve(result));
          });
        } catch (error) {
          accountCallbacks.forEach(({ callbacks }) => {
            callbacks.forEach(({ reject }) => reject(error));
          });
        }
      });
  } else if (replaceConnection) {
    config.connection = connection;
  }
  return config;
}

class ConnectionSubject<T> extends Subject<T> {
  constructor(public connection: Connection) {
    super();
  }
}

/**
 * Updates the configuration for Solana batch requests.
 *
 * This function allows you to set or update the configuration parameters for batching requests to the Solana blockchain.
 * The configuration includes parameters such as the time window for batching and the maximum batch size.
 *
 * @param {SolanaBatchRequestsConfig} config - The configuration object for Solana batch requests.
 * @example
 * setSolanaBatchRequestsConfig({
 *   timeWindow: 200, // Time window in milliseconds
 *   maximumBatchSize: 50 // Maximum number of requests in a single batch
 * });
 */
export function setSolanaBatchRequestsConfig(config: SolanaBatchRequestsConfig) {
  batchConfig = { ...batchConfig, ...config };
}

/**
 * Fetches a parsed account in a batch request.
 *
 * This function allows you to fetch a parsed account from the Solana blockchain using batch requests.
 * It optimizes network calls by consolidating multiple requests into a single batch, improving performance.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {PublicKey} account - The public key of the account to fetch.
 * @param {Object} [options] - Optional parameters.
 * @param {boolean} [options.replaceConnection=false] - Whether to replace the existing connection.
 * @returns {Promise<AccountInfo<Buffer | ParsedAccountData> | null>} A promise that resolves to the account information or null.
 * @example
 * const accountInfo = await getParsedAccountInBatch(connection, new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g'));
 * console.log(accountInfo);
 */
export const getParsedAccountInBatch = (
  connection: Connection,
  account: PublicKey,
  options?: {
    replaceConnection: boolean;
  }
) => {
  const config = getSubject(connection, options?.replaceConnection || false);
  return new Promise<AccountInfo<Buffer | ParsedAccountData> | null>((resolve, reject) => {
    config.next({ account: account.toString(), resolve, reject });
  });
};
/**
 * Tears down the batch requests.
 *
 * This function is responsible for cleaning up and terminating the batch request process.
 * It ensures that any ongoing batch requests are properly unsubscribed and resources are released.
 * This is particularly useful when you need to stop batching operations, such as during application shutdown or when switching connections.
 *
 * @example
 * // Example usage:
 * teardownBatchRequests();
 */
export const teardownBatchRequests = () => {
  $unsubscribe.next();
  $unsubscribe.complete();
  queryConfigs.clear();
};
