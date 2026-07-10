import { describe, expect, test } from "vitest";
import { MeshWallet, MeshTxBuilder, YaciProvider } from "@meshsdk/core";

// Devnet-depth: submits a real transaction to a local Yaci devnet and reads it
// back. Skipped unless TEST_DEVNET=1 (set only by the devnet CI job), so the
// offline run never touches the network.
const ENABLED = !!process.env.TEST_DEVNET;
const STORE = process.env.YACI_STORE_URL ?? "http://localhost:8080/api/v1/";
const ADMIN = process.env.YACI_ADMIN_URL ?? "http://localhost:10000";
const HEX64 = /^[0-9a-f]{64}$/i;

async function topup(address, ada) {
  await fetch(`${ADMIN}/local-cluster/api/addresses/topup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, adaAmount: ada }),
  });
}

async function pollUtxos(provider, address, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const utxos = await provider.fetchAddressUTxOs(address);
    if (utxos.length > 0) return utxos;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return [];
}

describe.skipIf(!ENABLED)("mesh devnet", () => {
  test("submits a transaction to the local devnet", async () => {
    const provider = new YaciProvider(STORE);
    const wallet = new MeshWallet({
      networkId: 0,
      fetcher: provider,
      submitter: provider,
      key: { type: "mnemonic", words: MeshWallet.brew() },
    });
    const addr = await wallet.getChangeAddress();

    await topup(addr, 10_000);
    const utxos = await pollUtxos(provider, addr);
    expect(utxos.length).toBeGreaterThan(0); // queries-utxos

    const dest = await new MeshWallet({
      networkId: 0,
      key: { type: "mnemonic", words: MeshWallet.brew() },
    }).getChangeAddress();

    const unsigned = await new MeshTxBuilder({ fetcher: provider, submitter: provider })
      .txOut(dest, [{ unit: "lovelace", quantity: "2000000" }])
      .changeAddress(addr)
      .selectUtxosFrom(utxos)
      .complete();

    const signed = await wallet.signTx(unsigned, true);
    const txHash = await wallet.submitTx(signed); // submits-transactions
    expect(txHash).toMatch(HEX64);
  });
});
