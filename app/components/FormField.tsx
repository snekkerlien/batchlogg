import { cloneElement, type ReactElement, type ReactNode } from "react";

type FormFieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

type FormFieldProps = {
  id: string;
  label: ReactNode;
  children: ReactElement<FormFieldControlProps>;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
};

export default function FormField({
  id,
  label,
  children,
  required = false,
  hint,
  error,
}: FormFieldProps) {
  const describedBy = [
    children.props["aria-describedby"],
    hint ? `${id}-hint` : "",
    error ? `${id}-error` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const control = cloneElement(children, {
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : children.props["aria-invalid"],
  });

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
        {required && (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      {control}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-white/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
