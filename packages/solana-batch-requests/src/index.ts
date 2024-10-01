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
import { Subject, timer } from 'rxjs';
import { buffer, debounce } from 'rxjs/operators';

interface QueryItem {
  account: String;
  resolve: (account: AccountInfo<Buffer | ParsedAccountData> | null) => void;
  reject: (error: unknown) => void;
}

const queryConfigs = new Map<string, ConnectionSubject<QueryItem>>();

let timeWindow = 500;
let getAccountConfig: GetMultipleAccountsConfig | undefined = undefined;

function getSubject(connection: Connection, replaceConnection = true) {
  let config = queryConfigs.get(connection.rpcEndpoint);
  if (!config) {
    config = new ConnectionSubject<QueryItem>(connection);
    queryConfigs.set(connection.rpcEndpoint, config);
    config
      .pipe(
        buffer(config.pipe(debounce(() => timer(timeWindow)))) //
      )
      .subscribe(async (items) => {
        if (items.length === 0) return;

        const groupedAccounts = groupBy(items, (item) => item.account);
        const acocuntCallbacks = map(groupedAccounts, (items, account) => ({
          account,
          callbacks: items.map((item) => omit(item, ['account'])),
        }));

        try {
          const res = await connection.getMultipleParsedAccounts(
            acocuntCallbacks.map((item) => new PublicKey(item.account)),
            getAccountConfig
          );

          // console.log('res', acocuntCallbacks, res);

          acocuntCallbacks.forEach(({ callbacks }, index) => {
            const result = res.value?.[index];
            callbacks.forEach(({ resolve }) => resolve(result));
          });
        } catch (error) {
          acocuntCallbacks.forEach(({ callbacks }) => {
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
 * Sets the configuration for Solana batch queries.
 *
 * @param {Object} config - The configuration object.
 * @param {number} [config.timeWindow=500] - The time window in milliseconds for batching queries.
 * @param {GetMultipleAccountsConfig} [config.getAccountConfig] - The configuration for getting multiple accounts.
 */
export function setSolanaBatchRequestsConfig(config: {
  timeWindow?: number;
  getAccountConfig?: GetMultipleAccountsConfig;
}) {
  timeWindow = config.timeWindow || 500;
  getAccountConfig = config.getAccountConfig;
}

/**
 * Retrieves a parsed account in batch mode.
 *
 * This function batches requests for parsed accounts and resolves to the account information or null if the account is not found.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {PublicKey} account - The public key of the account to retrieve.
 * @param {Object} [options] - Optional parameters for the function.
 * @param {boolean} [options.replaceConnection=false] - Indicates whether to replace the connection in the configuration.
 * @returns {Promise<AccountInfo<Buffer | ParsedAccountData> | null>} A promise that resolves to the account information or null.
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
