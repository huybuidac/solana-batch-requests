# Solana Batch Requests

Solana Batch Requests is an npm package that allows you to batch multiple requests to the Solana blockchain, optimizing the number of network calls and improving performance.

## Installation

To install the package, use npm, yarn, pnpm, bun or whatever package manager you like.

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

Anchor is so good framework, but when you want to fetch account data, you have to fetch them one by one.

```ts
// https://github.com/solana-developers/pirate-bootcamp/blob/14e7313fbdfffc63e0a42744e6be708c2b7a38a0/quest-6/idle-game/app/src/components/Game.tsx#L145
export function FC() {
  // ...
  const program = new Program<IdleGame>(IDL, IDLE_GAME_PROGRAM_ID, provider)

  useEffect(async () => {
    const game1 = await program.account.gameData.fetch(gameDataPDA1)
    const game2 = await program.account.gameData.fetch(gameDataPDA2)
    const game3 = await program.account.gameData.fetch(gameDataPDA3)
  }, [program])
}
```

It will be better if you can fetch them in a single request.

```ts
import { getParsedAccountInBatch } from 'solana-batch-requests';

export function FC() {
  // ...
  const {connection} = useConnection()
  const program = new Program<IdleGame>(IDL, IDLE_GAME_PROGRAM_ID, provider)

  useEffect(async () => {
    // 3 accounts fetched in a single request
    const gameAccounts = await Promise.all([
      getParsedAccountInBatch(connection, gameDataPDA1),
      getParsedAccountInBatch(connection, gameDataPDA2),
      getParsedAccountInBatch(connection, gameDataPDA3),
    ])
    const gameParseds = gameAccounts.map((acc) => program.coder.accounts.decode("gameData", acc.data))
  }, [program])
}
```
