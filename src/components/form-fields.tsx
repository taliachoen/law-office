import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// שדות טופס עם תווית ושגיאה מקושרות (נגישות): aria-invalid ו-aria-describedby.
// select רגיל של הדפדפן ולא רכיב מותאם: הוא נשלח ב-FormData כמו שהוא, נגיש במקלדת ובטלפון.

type FieldShell = { name: string; label: string; error?: string; required?: boolean };

function FieldWrap({ name, label, error, required, children }: FieldShell & { children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-700"> *</span>}
      </Label>
      {children}
      {error && (
        <p id={`${name}-error`} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({ name, label, error, required, ...props }: FieldShell & Omit<ComponentProps<typeof Input>, "name">) {
  return (
    <FieldWrap name={name} label={label} error={error} required={required}>
      <Input id={name} name={name} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} {...props} />
    </FieldWrap>
  );
}

export function TextAreaField({ name, label, error, required, ...props }: FieldShell & Omit<ComponentProps<typeof Textarea>, "name">) {
  return (
    <FieldWrap name={name} label={label} error={error} required={required}>
      <Textarea id={name} name={name} rows={3} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} {...props} />
    </FieldWrap>
  );
}

export function SelectField({
  name, label, error, required, options, placeholder, className, ...props
}: FieldShell & {
  options: { value: string; label: string }[];
  /** כשמוגדר, מופיעה אפשרות ריקה ראשונה (לשדות אופציונליים או לסינון) */
  placeholder?: string;
} & Omit<ComponentProps<"select">, "name">) {
  return (
    <FieldWrap name={name} label={label} error={error} required={required}>
      <select
        id={name}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={cn(
          "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}
