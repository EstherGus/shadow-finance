"use client";

import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Navigation links for main application routes
const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budget", label: "Budget" },
  { href: "/goals", label: "Goals" },
  { href: "/analytics", label: "Analytics" },
];

export function Navbar() {
  const { provider, chainId, accounts, isConnected, connect, error } =
    useMetaMask();
  const { ethersSigner } = useMetaMaskEthersSigner();
  const { instance, status: fhevmStatus } = useFhevm({
    provider,
    chainId,
    enabled: isConnected,
  });
  const { storage } = useInMemoryStorage();
  const [decryptionSignature, setDecryptionSignature] =
    useState<FhevmDecryptionSignature | null>(null);

  useEffect(() => {
    if (instance && ethersSigner && accounts && accounts.length > 0) {
      const contractAddresses: string[] = [];
      FhevmDecryptionSignature.loadOrSign(
        instance,
        contractAddresses,
        ethersSigner,
        storage
      ).then((sig) => {
        if (sig) {
          setDecryptionSignature(sig);
        }
      });
    }
  }, [instance, ethersSigner, accounts, storage]);

  const formattedAddress = useMemo(() => {
    if (!accounts || accounts.length === 0) return "";
    const address = accounts[0];
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [accounts]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-[18px] bg-white/65 dark:bg-[#0f111d]/65 border-b border-white/40 dark:border-[#252b43]/60 shadow-[0_12px_40px_rgba(131,209,204,0.18)]">
      <div className="sf-container">
        <div className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#83d1cc] via-[#48a9d0] to-[#6072e9] text-white font-semibold shadow-lg">
              SF
            </span>
            <div>
              <Link href="/" className="text-xl font-semibold tracking-tight">
                ShadowFinance
              </Link>
              <p className="text-xs text-[var(--color-text-muted)]">
                Encrypted personal finance cockpit
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full bg-white/70 dark:bg-white/5 border border-white/50 dark:border-[#252b43]/60 shadow-[0_10px_30px_rgba(96,114,233,0.22)]">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!isConnected ? (
              <button
                onClick={connect}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-slate-900 bg-gradient-to-r from-[#83d1cc] via-[#48a9d0] to-[#6072e9] shadow-[0_15px_35px_rgba(96,114,233,0.35)] transition-all duration-200 hover:shadow-[0_18px_45px_rgba(96,114,233,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6072e9]"
              >
                <span>Connect Wallet</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-right text-xs text-[var(--color-text-muted)]">
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {formattedAddress}
                  </span>
                  <span>
                    Chain #{chainId} · {fhevmStatus === "ready" ? "FHE ready" : "Syncing"}
                  </span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-[rgba(131,209,204,0.18)] text-xs font-medium text-[#27758b] dark:bg-[rgba(96,114,233,0.2)] dark:text-[#8fa7ff]">
                  {decryptionSignature ? "Decryption active" : "Awaiting signature"}
                </div>
              </div>
            )}
          </div>
        </div>
        {error && (
          <div className="mb-4 rounded-xl border border-[#f7419f]/40 bg-[#f7419f]/10 px-4 py-2 text-sm text-[#a11d64] dark:text-[#fcd2e5]">
            {error.message}
          </div>
        )}
      </div>
    </header>
  );
}


