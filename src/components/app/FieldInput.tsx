import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SelectBox } from "./ui";
import type { FieldDef } from "@/lib/generate";

export function FieldInput({ field, value, onChange, invalid }: { field: FieldDef; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const id = `f-${field.key}`;
  const cls = invalid ? "mt-1.5 border-destructive" : "mt-1.5";
  return (
    <div className={field.field_type === "textarea" ? "sm:col-span-2" : ""}>
      <Label htmlFor={id}>{field.label}{field.required && <span className="text-primary"> *</span>}</Label>
      {field.field_type === "textarea" ? (
        <Textarea id={id} className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : field.field_type === "select" ? (
        <SelectBox id={id} className={cls} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </SelectBox>
      ) : (
        <Input id={id} className={cls} value={value} onChange={(e) => onChange(e.target.value)}
          type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"} />
      )}
      {invalid && <p className="mt-1 text-xs text-destructive">Required</p>}
    </div>
  );
}
