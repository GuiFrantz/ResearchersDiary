"use client";

import type { FormEvent, ReactNode } from "react";
import Icon from "./icons";

interface Props {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  formId?: string;
  onSubmit?: (e: FormEvent) => void;
}

const BODY = "flex-1 overflow-y-auto p-5";

export default function Drawer({ title, onClose, footer, children, formId, onSubmit }: Props) {
  return (
    <>
      <div className="fixed inset-0 bg-ink/20 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white border-l border-dust-300 shadow-drawer z-40 flex flex-col">
        <div className="px-5 py-4 border-b border-dust-200 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-dust-500 hover:text-dust-700 flex transition-colors">
            <Icon name="close" size={18} />
          </button>
        </div>
        {formId || onSubmit ? (
          <form id={formId} onSubmit={onSubmit} className={BODY}>{children}</form>
        ) : (
          <div className={BODY}>{children}</div>
        )}
        {footer && (
          <div className="px-5 py-3.5 border-t border-dust-200 flex items-center gap-2 shrink-0">{footer}</div>
        )}
      </div>
    </>
  );
}
