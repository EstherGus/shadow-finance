"use client";

import { ReactNode } from "react";
import { MetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { MetaMaskEthersSignerProvider } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import { ShadowFinanceProvider } from "@/contexts/ShadowFinanceContext";

const MOCK_CHAINS: Readonly<Record<number, string>> = {
  31337: "http://localhost:8545",
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MetaMaskProvider>
      <MetaMaskEthersSignerProvider initialMockChains={MOCK_CHAINS}>
        <InMemoryStorageProvider>
          <ShadowFinanceProvider>{children}</ShadowFinanceProvider>
        </InMemoryStorageProvider>
      </MetaMaskEthersSignerProvider>
    </MetaMaskProvider>
  );
}


