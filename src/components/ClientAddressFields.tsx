import type { ClientAddressFields as ClientAddressValues } from "@/lib/client-form";

type ClientAddressFieldsProps = {
  values: ClientAddressValues;
  onChange: (field: keyof ClientAddressValues, value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
  compact?: boolean;
};

export default function ClientAddressFields({
  values,
  onChange,
  disabled = false,
  idPrefix = "client-address",
  compact = false,
}: ClientAddressFieldsProps) {
  const fieldClass = compact ? "field field-compact" : "field";
  const labelClass = compact ? "doc-label text-[9px]" : "doc-label";

  if (compact) {
    return (
      <div className="invoice-address-compact">
        <input
          id={`${idPrefix}-line1`}
          className={fieldClass}
          placeholder="Street address"
          aria-label="Street address"
          value={values.addressLine1}
          onChange={(e) => onChange("addressLine1", e.target.value)}
          disabled={disabled}
        />
        <input
          id={`${idPrefix}-line2`}
          className={fieldClass}
          placeholder="Apt, suite (optional)"
          aria-label="Apt or suite"
          value={values.addressLine2}
          onChange={(e) => onChange("addressLine2", e.target.value)}
          disabled={disabled}
        />
        <div className="invoice-address-row">
          <input
            id={`${idPrefix}-city`}
            className={fieldClass}
            placeholder="City"
            aria-label="City"
            value={values.city}
            onChange={(e) => onChange("city", e.target.value)}
            disabled={disabled}
          />
          <input
            id={`${idPrefix}-state`}
            className={`${fieldClass} px-1.5 text-center uppercase`}
            placeholder="ST"
            aria-label="State"
            value={values.state}
            onChange={(e) => onChange("state", e.target.value.toUpperCase())}
            disabled={disabled}
            maxLength={2}
          />
          <input
            id={`${idPrefix}-zip`}
            className={fieldClass}
            placeholder="ZIP"
            aria-label="ZIP code"
            inputMode="numeric"
            value={values.zipCode}
            onChange={(e) => onChange("zipCode", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-line1`}>
          Street
        </label>
        <input
          id={`${idPrefix}-line1`}
          className={fieldClass}
          placeholder="123 Main St"
          value={values.addressLine1}
          onChange={(e) => onChange("addressLine1", e.target.value)}
          disabled={disabled}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-line2`}>
          Apt / Suite
        </label>
        <input
          id={`${idPrefix}-line2`}
          className={fieldClass}
          placeholder="Suite 100"
          value={values.addressLine2}
          onChange={(e) => onChange("addressLine2", e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label className={labelClass} htmlFor={`${idPrefix}-city`}>
            City
          </label>
          <input
            id={`${idPrefix}-city`}
            className={fieldClass}
            placeholder="City"
            value={values.city}
            onChange={(e) => onChange("city", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="sm:col-span-1">
          <label className={labelClass} htmlFor={`${idPrefix}-state`}>
            State
          </label>
          <input
            id={`${idPrefix}-state`}
            className={fieldClass}
            placeholder="CA"
            value={values.state}
            onChange={(e) => onChange("state", e.target.value.toUpperCase())}
            disabled={disabled}
            maxLength={2}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor={`${idPrefix}-zip`}>
            ZIP
          </label>
          <input
            id={`${idPrefix}-zip`}
            className={fieldClass}
            placeholder="90210"
            inputMode="numeric"
            value={values.zipCode}
            onChange={(e) => onChange("zipCode", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
