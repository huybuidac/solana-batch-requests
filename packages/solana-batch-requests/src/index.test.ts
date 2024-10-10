import { Connection, PublicKey } from '@solana/web3.js';
import { getParsedAccountInBatch, setSolanaBatchRequestsConfig, teardownBatchRequests } from '.';

describe('solana-batch-requests', () => {
  let connection: any;
  beforeAll(() => {
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    setSolanaBatchRequestsConfig({
      timeWindow: 100,
      maximumBatchSize: 3
    });
  });
  afterAll(async () => {
    teardownBatchRequests();
    await delay(1000);
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
  it('Time window, mut request after 100ms from first request', async () => {
    const connection = {
      rpcEndpoint: 'mock-url3',
      getMultipleParsedAccounts: jest.fn((arg: any, config: any) => {
        return Promise.resolve({
          value: [{}, {}],
        });
      }),
    } as any;

    const task1 = getParsedAccountInBatch(connection, new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g'));
    await delay(70);
    const task2 = getParsedAccountInBatch(connection, new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb'));
    await delay(50);
    const task3 = getParsedAccountInBatch(connection, new PublicKey('A8y5pthGCm9247db3vFspvQDWZpANMByr23ekHMGVQ5W'));
    await Promise.all([task1, task2, task3]);

    expect(connection.getMultipleParsedAccounts).toHaveBeenCalledTimes(2);
  });
  it('Maximum batch size', async () => {
    const connection = {
      rpcEndpoint: 'mock-url4',
      getMultipleParsedAccounts: jest.fn((arg: any, config: any) => {
        return Promise.resolve({
          value: [{}, {}, {}],
        });
      }),
    } as any;
    await Promise.all([
      getParsedAccountInBatch(connection, new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g')),
      getParsedAccountInBatch(connection, new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb')),
      getParsedAccountInBatch(connection, new PublicKey('A8y5pthGCm9247db3vFspvQDWZpANMByr23ekHMGVQ5W')),
      getParsedAccountInBatch(connection, new PublicKey('EjE49XNdiLbPGiUHXdN73vnxv85TtjzSoZCp2t2Q5wms')),
    ]);
    expect(connection.getMultipleParsedAccounts).toHaveBeenCalledTimes(2);
  });
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
