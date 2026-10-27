import { useSyncExternalStore } from 'react';
import type { Wallet } from '@/types';
import { api, errorMessage } from './api';

type WalletState = { wallet: Wallet | null; error: string | null };

let state: WalletState = { wallet: null, error: null };
const listeners = new Set<() => void>();

export function setWallet(wallet: Wallet | null): void {
  state = { wallet, error: null };
  listeners.forEach((listener) => listener());
}

export async function loadWallet(): Promise<void> {
  try {
    setWallet(await api<Wallet>('/api/wallet'));
  } catch (err) {
    state = { ...state, error: errorMessage(err) };
    listeners.forEach((listener) => listener());
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWallet(): WalletState {
  return useSyncExternalStore(subscribe, () => state);
}
