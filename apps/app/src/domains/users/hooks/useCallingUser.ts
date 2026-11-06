import { useSyncExternalStore } from 'react';
import { callingUserStore, type CallingUserState } from '../callingUserStore';

/** Who's signed in, re-rendering when it changes. */
export function useCallingUser(): CallingUserState {
  return useSyncExternalStore(callingUserStore.subscribe, callingUserStore.get);
}
