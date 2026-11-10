import { useCallback, useEffect, useRef } from "react";

export const AUTO_ADVANCE_DELAY_MS = 900;

type Options = {
  sessionId?: string;
  exerciseId?: string;
  answered: boolean;
  active: boolean;
  enabled: boolean;
  onAdvance: (sessionId: string, exerciseId: string) => void;
};

export function useAutoAdvance({ sessionId, exerciseId, answered, active, enabled, onAdvance }: Options) {
  const timerRef = useRef<number | null>(null);
  const cancel = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    cancel();
    if (!sessionId || !exerciseId || !answered || !active || !enabled) return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      // The parent also guards identity to reject callbacks already in the queue.
      onAdvance(sessionId, exerciseId);
    }, AUTO_ADVANCE_DELAY_MS);
    return cancel;
  }, [sessionId, exerciseId, answered, active, enabled, onAdvance, cancel]);

  return cancel;
}
