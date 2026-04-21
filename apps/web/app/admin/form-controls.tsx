"use client";

import { useFormStatus } from "react-dom";
import type { FormEvent, ReactNode } from "react";

type ConfirmFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
};

export function ConfirmForm({ action, children, className }: ConfirmFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLElement
      | null;
    const message = submitter?.dataset.confirm;

    if (message && !window.confirm(message)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} className={className} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}

type SubmitButtonProps = {
  children: ReactNode;
  className: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  pendingLabel?: string;
  confirmMessage?: string;
};

export function SubmitButton({
  children,
  className,
  disabled = false,
  name,
  value,
  pendingLabel = "Procesando...",
  confirmMessage
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      data-confirm={confirmMessage}
      disabled={pending || disabled}
      name={name}
      type="submit"
      value={value}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
