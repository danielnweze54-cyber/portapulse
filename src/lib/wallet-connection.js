export function createWalletConnectionHandler({
  walletAttemptRef,
  walletEventAccountRef,
  walletEventSeenRef,
  walletAccountEventRef,
  getInjectedWallet,
  ensurePortaldotTestnet,
  targetChainId,
  setWalletAccount,
  setWalletVerified,
  setWalletBusy,
  setWalletMessage,
}) {
  return async function handleConnectWallet() {
    const attemptId = ++walletAttemptRef.current;
    const isCurrentAttempt = () => attemptId === walletAttemptRef.current;

    setWalletMessage("");
    setWalletVerified(false);

    const wallet = getInjectedWallet();
    if (!wallet) {
      setWalletAccount(null);
      setWalletMessage(
        "No injected EVM wallet was found. Install or unlock MetaMask, then retry.",
      );
      return;
    }

    setWalletBusy(true);
    const accountEventVersion = walletAccountEventRef.current;
    let approvedEventVersion = accountEventVersion;

    try {
      const accounts = await wallet.request({ method: "eth_requestAccounts" });

      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error("The wallet did not return an account.");
      }

      const requestedAccount = accounts[0];
      const eventAccount = walletEventAccountRef.current;
      approvedEventVersion = walletAccountEventRef.current;

      if (
        walletEventSeenRef.current &&
        (!eventAccount ||
          eventAccount.toLowerCase() !== requestedAccount.toLowerCase())
      ) {
        throw new Error("The active wallet account changed. Please reconnect.");
      }

      // A matching accountsChanged event during initial approval is allowed,
      // but this attempt must never adopt a newer attempt's ID.
      if (!isCurrentAttempt()) return;
      if (walletAccountEventRef.current !== approvedEventVersion) return;
      if (
        approvedEventVersion !== accountEventVersion &&
        (!eventAccount ||
          eventAccount.toLowerCase() !== requestedAccount.toLowerCase())
      ) {
        throw new Error("The active wallet account changed. Please reconnect.");
      }
      setWalletBusy(true);

      await ensurePortaldotTestnet(wallet);
      if (!isCurrentAttempt()) return;
      if (walletAccountEventRef.current !== approvedEventVersion) return;

      const [activeAccounts, activeChain] = await Promise.all([
        wallet.request({ method: "eth_accounts" }),
        wallet.request({ method: "eth_chainId" }),
      ]);

      if (!isCurrentAttempt()) return;
      if (walletAccountEventRef.current !== approvedEventVersion) return;

      const latestEventAccount = walletEventAccountRef.current;
      if (
        walletEventSeenRef.current &&
        (!latestEventAccount ||
          latestEventAccount.toLowerCase() !== requestedAccount.toLowerCase())
      ) {
        throw new Error("The active wallet account changed. Please reconnect.");
      }

      if (
        !Array.isArray(activeAccounts) ||
        typeof activeAccounts[0] !== "string" ||
        activeAccounts[0].toLowerCase() !== requestedAccount.toLowerCase()
      ) {
        throw new Error("The active wallet account changed. Please reconnect.");
      }

      if (
        typeof activeChain !== "string" ||
        BigInt(activeChain) !== BigInt(targetChainId)
      ) {
        throw new Error(
          "Wallet is no longer connected to Portaldot V3 Testnet.",
        );
      }

      setWalletAccount(requestedAccount);
      setWalletVerified(true);
      setWalletMessage(
        "Wallet connected and verified on Portaldot V3 Testnet.",
      );
    } catch (error) {
      if (!isCurrentAttempt()) return;
      if (walletAccountEventRef.current !== approvedEventVersion) return;

      setWalletAccount(null);
      setWalletVerified(false);
      setWalletMessage(error instanceof Error ? error.message : String(error));
    } finally {
      if (isCurrentAttempt()) {
        setWalletBusy(false);
      }
    }
  };
}
