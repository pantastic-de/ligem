"use client";

// Wraps a normal submit button with a native confirm() dialog — used for the
// few actions in the admin area that are actually destructive (hard delete),
// unlike status changes like Ablehnen/Archivieren which stay reversible.
export function ConfirmSubmitButton({
  confirmText,
  className,
  children,
  ...buttonProps
}: {
  confirmText: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className" | "children" | "onClick">) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
