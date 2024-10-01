'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getParsedAccountInBatch, setSolanaBatchRequestsConfig } from 'solana-batch-requests';
import { useAsync, useInterval } from 'react-use';

const TIME_WINDOW = 2000;

setSolanaBatchRequestsConfig({
  timeWindow: TIME_WINDOW,
});

export default function Home() {
  const connection = useMemo(() => new Connection('https://api.devnet.solana.com', 'confirmed'), []);

  const [requestId, setRequestId] = useState(0);

  const [account1, setAccount1] = useState({
    name: 'Account',
    publicKey: new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g'),
    data: null as any,
  });
  const [account2, setAccount2] = useState({
    name: 'Mint',
    publicKey: new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb'),
    data: null as any,
  });
  const [account3, setAccount3] = useState({
    name: 'TokenAccount',
    publicKey: new PublicKey('A8y5pthGCm9247db3vFspvQDWZpANMByr23ekHMGVQ5W'),
    data: null as any,
  });
  const accounts = useMemo(() => [account1, account2, account3], [account1, account2, account3]);

  const [batchEnabled, setBatchEnabled] = useState(false);
  const [collectingTime, setCollectingTime] = useState(TIME_WINDOW);

  const isBatchCollecting = useMemo(() => collectingTime < TIME_WINDOW, [collectingTime]);

  useInterval(
    () => {
      if (collectingTime < TIME_WINDOW) {
        setCollectingTime(Math.min(collectingTime + 100, TIME_WINDOW));
      }
    },
    batchEnabled && collectingTime < TIME_WINDOW ? 100 : null
  );

  const fetchAccount = useCallback(
    async (publicKey: PublicKey) => {
      if (batchEnabled) {
        return getParsedAccountInBatch(connection, publicKey);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 300)); // too quick
        return connection.getParsedAccountInfo(publicKey);
      }
    },
    [batchEnabled, connection]
  );

  useAsync(async () => {
    if (!requestId) return;
    const acc = await fetchAccount(account1.publicKey);
    setAccount1({ ...account1, data: acc });
  }, [requestId]);

  useAsync(async () => {
    if (!requestId) return;
    const acc = await fetchAccount(account2.publicKey);
    setAccount2({ ...account2, data: acc });
  }, [requestId]);

  useAsync(async () => {
    if (!requestId) return;
    const acc = await fetchAccount(account3.publicKey);
    setAccount3({ ...account3, data: acc });
  }, [requestId]);

  const fetchData = async () => {
    setAccount1({ ...account1, data: null });
    setAccount2({ ...account2, data: null });
    setAccount3({ ...account3, data: null });
    setRequestId(requestId + 1);
    if (batchEnabled) {
    setCollectingTime(0);
    }
  };

  return (
    <main className="flex flex-col w-full px-12">
      <div className="mt-24 text-center text-red-500">Open Network Inspector To See Network Requests</div>
      <div className="flex gap-2 items-center">
        <label htmlFor="isBatchCollecting" className="font-medium">
          Batch Requests Enabled:
        </label>
        <input
          type="checkbox"
          id="isBatchCollecting"
          checked={batchEnabled}
          disabled={isBatchCollecting}
          onChange={() => setBatchEnabled(!batchEnabled)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>
      <div>
        <span>Status: {isBatchCollecting ? 'Requests Collecting' : 'Idle'}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-blue-600 h-4 rounded-full"
          style={{ width: `${(collectingTime / TIME_WINDOW) * 100}%`, transition: 'width 0.1s' }}
        />
      </div>
      <div className="w-full overflow-x-scroll">
        <table className="w-full divide-gray-200 max-w-80">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Account
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Data
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 box-border">
            {accounts.map((account) => (
              <tr key={account.publicKey.toString()}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.publicKey.toString()}</td>
                <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">
                  {JSON.stringify(account.data, null, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={fetchData}
        disabled={isBatchCollecting}
        className="w-80 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition duration-300"
      >
        Fetch Data
      </button>
    </main>
  );
}
