import assert from "node:assert/strict";
import test from "node:test";
import { createWalletEventHandlers } from "./wallet-events.js";

const TARGET_CHAIN = 420420777;

function setup() {
  const refs = {
    walletAttemptRef: { current: 1 },
    walletAccountEventRef: { current: 0 },
    walletEventAccountRef: { current: null },
    walletEventSeenRef: { current: false },
  };

  const state = {
    account: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    verified: true,
    busy: true,
    message: "",
  };

  const handlers = createWalletEventHandlers({
    ...refs,
    targetChainId: TARGET_CHAIN,
    setWalletAccount: (value) => {
      state.account = value;
    },
    setWalletVerified: (value) => {
      state.verified = value;
    },
    setWalletBusy: (value) => {
      state.busy = value;
    },
    setWalletMessage: (value) => {
      state.message = value;
    },
  });

  return { ...refs, state, ...handlers };
}

test("unexpected network change invalidates the attempt and clears busy state", () => {
  const app = setup();

  app.handleChainChanged("0x1");

  assert.equal(app.walletAttemptRef.current, 2);
  assert.equal(app.state.verified, false);
  assert.equal(app.state.busy, false);
  assert.match(app.state.message, /Network changed/);
});

test("switching to the target network does not invalidate the pending attempt", () => {
  const app = setup();

  app.handleChainChanged(`0x${TARGET_CHAIN.toString(16)}`);

  assert.equal(app.walletAttemptRef.current, 1);
  assert.equal(app.state.verified, false);
  assert.match(app.state.message, /Network changed/);
});

test("invalid chain ID invalidates the pending attempt", () => {
  const app = setup();

  app.handleChainChanged("not-a-chain-id");

  assert.equal(app.walletAttemptRef.current, 2);
  assert.equal(app.state.verified, false);
  assert.equal(app.state.busy, false);
});

test("accountsChanged updates the account and clears verification", () => {
  const app = setup();
  const nextAccount = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  app.handleAccountsChanged([nextAccount]);

  assert.equal(app.walletAccountEventRef.current, 1);
  assert.equal(app.walletEventAccountRef.current, nextAccount);
  assert.equal(app.state.account, nextAccount);
  assert.equal(app.state.verified, false);
  assert.equal(app.state.busy, false);
  assert.match(app.state.message, /Account changed/);
});

test("accountsChanged with an empty list clears the wallet account", () => {
  const app = setup();

  app.handleAccountsChanged([]);

  assert.equal(app.walletAccountEventRef.current, 1);
  assert.equal(app.walletEventAccountRef.current, null);
  assert.equal(app.state.account, null);
  assert.equal(app.state.verified, false);
  assert.equal(app.state.busy, false);
  assert.match(app.state.message, /disconnected/i);
});
