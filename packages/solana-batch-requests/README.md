# Solana Batch Requests

Solana Batch Requests is an npm package that allows you to batch multiple requests to the Solana blockchain, optimizing the number of network calls and improving performance.

## Installation

To install the package, use npm, yarn, pnpm, bun, or any other package manager you prefer.

```bash
npm install solana-batch-requests
```

## Usage

### Fetch Multiple Accounts in a Single Request

```ts
import { getParsedAccountInBatch } from 'solana-batch-requests';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const [account1, account2] = await Promise.all([
  getParsedAccountInBatch(connection, new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g')),
  getParsedAccountInBatch(connection, new PublicKey('JDWYBjxEvEWt8yPhdb6BhNerfXaiXogRgUX2yW2AHUVb')),
]);
```
**Note:** Although multiple accounts are fetched using two function calls, the library optimizes the process by consolidating these into a single request to the Solana blockchain. This approach significantly reduces network overhead and enhances performance.

### Sample with Anchor

Anchor is a powerful framework, but fetching account data typically requires individual requests for each account.

```ts
// Reference: https://github.com/solana-developers/pirate-bootcamp/blob/14e7313fbdfffc63e0a42744e6be708c2b7a38a0/quest-6/idle-game/app/src/components/Game.tsx#L145
export function FC() {
  // ...
  const program = new Program<IdleGame>(IDL, IDLE_GAME_PROGRAM_ID, provider);

  useEffect(() => {
    const fetchData = async () => {
      const game1 = await program.account.gameData.fetch(gameDataPDA1);
      const game2 = await program.account.gameData.fetch(gameDataPDA2);
      const game3 = await program.account.gameData.fetch(gameDataPDA3);
    };
    fetchData();
  }, [program]);
}
```

To enhance efficiency, consider fetching multiple accounts in a single request.

```ts
import { getParsedAccountInBatch } from 'solana-batch-requests';

export function FC() {
  // ...
  const { connection } = useConnection();
  const program = new Program<IdleGame>(IDL, IDLE_GAME_PROGRAM_ID, provider);

  // Fetch multiple accounts in a single request, improving performance
  useEffect(() => {
    const fetchData = async () => {
      const gameAccounts = await Promise.all([
        getParsedAccountInBatch(connection, gameDataPDA1),
        getParsedAccountInBatch(connection, gameDataPDA2),
        getParsedAccountInBatch(connection, gameDataPDA3),
      ]);
      const gameParseds = gameAccounts.map((acc) => program.coder.accounts.decode("gameData", acc.data));
    };
    fetchData();
  }, [program]);

  useEffect(() => {
    const fetchData = async () => {
      const acc = await getParsedAccountInBatch(connection, gameDataPDA4);
      const gameParsed4 = program.coder.accounts.decode("gameData", acc.data);
    };
    fetchData();
  }, [program]);
}
```
