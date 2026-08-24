"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
}

export default function Modal({ title, onClose, children, widthClassName = "max-w-2xl" }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className={`w-full ${widthClassName} max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
