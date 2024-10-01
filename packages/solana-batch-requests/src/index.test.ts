import { Connection, PublicKey } from '@solana/web3.js';
import { getParsedAccountInBatch, setSolanaBatchRequestsConfig } from '.';

describe('solana-batch-requests', () => {
  let connection: any;
  beforeAll(() => {
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    setSolanaBatchRequestsConfig({
      timeWindow: 100,
    });
  });
  it('fetch 1 account OK', async () => {
    const account = await getParsedAccountInBatch(
      connection,
      new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g')
    );
    expect(account).toBeDefined();
    expect(account?.rentEpoch).toBeGreaterThan(0);
  });
  it('fetch mint account OK', async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const account = await getParsedAccountInBatch(
      connection,
      new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb')
    );
    expect(account).toBeDefined();
    expect((account as any)?.data?.parsed?.type).toBe('mint');
  });
  it('Fetch 2 accounts in 1 request with devnet', async () => {
    const [account1, account2] = await Promise.all([
      getParsedAccountInBatch(connection, new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g')),
      getParsedAccountInBatch(connection, new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb')),
    ]);
    expect(account1?.rentEpoch).toBeGreaterThan(0);
    expect(account2?.rentEpoch).toBeGreaterThan(0);
  });
  it('Fetch 2 accounts in 1 requets', async () => {
    // mock connection
    const connection = {
      rpcEndpoint: 'mock-url',
      getMultipleParsedAccounts: jest.fn((arg: any, config: any) => {
        return Promise.resolve({
          value: [{}, {}],
        });
      }),
    } as any;

    await Promise.all([
      getParsedAccountInBatch(connection, new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g')),
      getParsedAccountInBatch(connection, new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb')),
    ]);

    expect(connection.getMultipleParsedAccounts).toHaveBeenCalledTimes(1);
    expect(connection.getMultipleParsedAccounts).toHaveBeenCalledWith(
      [
        new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g'),
        new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb'),
      ],
      undefined
    );
  });
  it('fetch 2 accounts in 2 requests', async () => {
    const connection = {
      rpcEndpoint: 'mock-url2',
      getMultipleParsedAccounts: jest.fn((arg: any, config: any) => {
        return Promise.resolve({
          value: [{}, {}],
        });
      }),
    } as any;

    getParsedAccountInBatch(connection, new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g'));
    await new Promise((resolve) => setTimeout(resolve, 200));
    await getParsedAccountInBatch(connection, new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb'));

    expect(connection.getMultipleParsedAccounts).toHaveBeenCalledTimes(2);
    expect(connection.getMultipleParsedAccounts).toHaveBeenCalledWith(
      [new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g')],
      undefined
    );
    expect(connection.getMultipleParsedAccounts).toHaveBeenCalledWith(
      [new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb')],
      undefined
    );
  });
});
