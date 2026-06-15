import { create } from "zustand";

interface Pending {
  retry: boolean;
  resolve: (pw: string) => void;
  reject: () => void;
}

interface PwState {
  pending: Pending | null;
  submit: (pw: string) => void;
  cancel: () => void;
}

export const usePasswordPrompt = create<PwState>((set, get) => ({
  pending: null,
  submit: (pw) => {
    get().pending?.resolve(pw);
    set({ pending: null });
  },
  cancel: () => {
    get().pending?.reject();
    set({ pending: null });
  },
}));

/** Returns a promise that resolves with the password the user types, or rejects on cancel. */
export function requestPassword(retry: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    usePasswordPrompt.setState({ pending: { retry, resolve, reject } });
  });
}
