export function createWalletEventHandlers({
  walletAttemptRef,
  walletAccountEventRef,
  walletEventAccountRef,
  walletEventSeenRef,
  targetChainId,
  setWalletAccount,
  setWalletVerified,
  setWalletBusy,
  setWalletMessage,
}) {
  const handleAccountsChanged = (accounts) => {
    walletAccountEventRef.current += 1;
    const account =
      Array.isArray(accounts) && typeof accounts[0] === "string"
        ? accounts[0]
        : null;

    walletEventSeenRef.current = true;
    walletEventAccountRef.current = account;
    setWalletBusy(false);
    setWalletAccount(account);
    setWalletVerified(false);
    setWalletMessage(
      account
        ? "Account changed. Reconnect and verify the Portaldot V3 Testnet."
        : "Wallet disconnected.",
    );
  };

  const handleChainChanged = (chainId) => {
    let isTargetChain = false;

    try {
      isTargetChain =
        typeof chainId === "string" &&
        BigInt(chainId) === BigInt(targetChainId);
    } catch {
      isTargetChain = false;
    }

    if (!isTargetChain) {
      walletAttemptRef.current += 1;
      setWalletBusy(false);
    }

    setWalletVerified(false);
    setWalletMessage(
      "Network changed. Reconnect to verify Portaldot V3 Testnet.",
    );
  };

  return { handleAccountsChanged, handleChainChanged };
}
