"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { TEXT } from "@/lib/constants";

// Buttons
const BUTTON_VARIANTS = {
  primary: "font-medium bg-hunter text-dust-50 hover:bg-hunter-hover",
  outline: "font-medium bg-white border border-dust-400 text-dust-700 hover:border-dust-500",
  ghost: "text-dust-600 hover:text-ink hover:bg-dust-100",
  danger: "text-clay hover:bg-dust-100",
};

const BUTTON_SIZES = {
  sm: "text-xs px-2.5 py-1 rounded-md",
  md: "text-sm px-3.5 py-2 rounded-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
}

export function Button({ variant = "primary", size = "md", type = "button", className = "", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} disabled:opacity-50 transition-colors ${className}`}
      {...props}
    />
  );
}

// Form controls (width set by callers: w-full, flex-1, ...)
const CONTROL = "px-3 py-2 border border-dust-400 rounded-lg text-sm focus:outline-none focus:border-moss disabled:bg-dust-50";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${CONTROL} bg-white ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CONTROL} resize-y ${className}`} {...props} />;
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-dust-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

// Feedback
const BANNER_TONES = {
  error: "bg-clay-100 border border-clay-200 text-clay",
  success: "bg-leaf-100 text-leaf-700",
  notice: "bg-sand-100 border border-sand-200 text-sand-700",
};

export function Banner({ tone, className = "", children }: { tone: keyof typeof BANNER_TONES; className?: string; children: ReactNode }) {
  return <div className={`text-sm rounded-lg px-3 py-2 ${BANNER_TONES[tone]} ${className}`}>{children}</div>;
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${tone}`}>{children}</span>;
}

// Typography
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>;
}

export function SectionHeading({ className = "", children }: { className?: string; children: ReactNode }) {
  return <h2 className={`text-xs font-semibold tracking-widest uppercase text-dust-600 ${className}`}>{children}</h2>;
}

export function Loading() {
  return <p className="text-sm text-dust-500 py-6">{TEXT.common.loading}</p>;
}
