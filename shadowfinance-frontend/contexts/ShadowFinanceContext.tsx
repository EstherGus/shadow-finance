"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";

import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useFhevm } from "@/fhevm/useFhevm";
import {
  ShadowFinanceService,
  useShadowFinanceService,
} from "@/hooks/useShadowFinanceService";

type ShadowFinanceContextValue = ShadowFinanceService & {
  meta: {
    connect: () => void;
    isConnected: boolean;
    chainId: number | undefined;
    account: string | undefined;
    fhevmStatus: "idle" | "loading" | "ready" | "error";
    fhevmError?: Error;
  };
};

const ShadowFinanceContext = createContext<ShadowFinanceContextValue | undefined>(
  undefined
);

export function ShadowFinanceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const meta = useMetaMaskEthersSigner();
  const { storage } = useInMemoryStorage();

  const {
    instance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider: meta.provider,
    chainId: meta.chainId,
    initialMockChains: meta.initialMockChains,
    enabled: meta.isConnected,
  });

  const service = useShadowFinanceService({
    instance,
    signer: meta.ethersSigner,
    readonlyProvider: meta.ethersReadonlyProvider,
    chainId: meta.chainId,
    account: meta.accounts?.[0],
    storage,
    isConnected: meta.isConnected,
    fhevmStatus,
  });

  const value = useMemo<ShadowFinanceContextValue>(() => {
    return {
      state: service.state,
      actions: service.actions,
      meta: {
        connect: meta.connect,
        isConnected: meta.isConnected,
        chainId: meta.chainId,
        account: meta.accounts?.[0],
        fhevmStatus,
        fhevmError: fhevmError ?? undefined,
      },
    };
  }, [service, meta.connect, meta.isConnected, meta.chainId, meta.accounts, fhevmStatus, fhevmError]);

  return (
    <ShadowFinanceContext.Provider value={value}>
      {children}
    </ShadowFinanceContext.Provider>
  );
}

export function useShadowFinance() {
  const context = useContext(ShadowFinanceContext);
  if (!context) {
    throw new Error("useShadowFinance must be used within a ShadowFinanceProvider");
  }
  return context;
}




