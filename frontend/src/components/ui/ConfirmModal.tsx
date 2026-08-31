"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmModalProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function ConfirmModal({
  open,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="rounded-2xl p-6 w-full max-w-sm shadow-2xl border"
            style={{
              background: "rgba(15,17,27,0.35)",
              borderColor: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(24px) saturate(1.8)",
              WebkitBackdropFilter: "blur(24px) saturate(1.8)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-primary, #fff)" }}>
              {message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-secondary, rgba(255,255,255,0.7))",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{
                  background: danger
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(245,158,11,0.15)",
                  color: danger ? "#ef4444" : "var(--primary, #f59e0b)",
                  border: `1px solid ${
                    danger
                      ? "rgba(239,68,68,0.2)"
                      : "rgba(245,158,11,0.2)"
                  }`,
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    message: string;
    resolve: (v: boolean) => void;
    danger?: boolean;
    confirmLabel?: string;
  } | null>(null);

  const confirm = useCallback(
    (message: string, opts?: { danger?: boolean; confirmLabel?: string }) => {
      return new Promise<boolean>((resolve) => {
        setState({ message, resolve, ...opts });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const modal = state ? (
    <ConfirmModal
      open
      message={state.message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      confirmLabel={state.confirmLabel}
      danger={state.danger}
    />
  ) : null;

  return [confirm, modal] as const;
}

