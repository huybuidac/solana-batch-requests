const { Connection, PublicKey } = require('@solana/web3.js');
const { getParsedAccountInBatch } = require('solana-batch-requests');

const main = async () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const account = await getParsedAccountInBatch(connection, new PublicKey('tKeYE4wtowRb8yRroZShTipE18YVnqwXjsSAoNsFU6g'));
  console.log(account);
};

main();
