import ClientAddressFields from "@/components/ClientAddressFields";
import type { ClientAddressFields as ClientAddressValues } from "@/lib/client-form";

type AdminClientAddressCardProps = {
  values: ClientAddressValues;
  onChange: (field: keyof ClientAddressValues, value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export default function AdminClientAddressCard({
  values,
  onChange,
  disabled = false,
  idPrefix = "client-address",
}: AdminClientAddressCardProps) {
  return (
    <div className="info-card !p-4">
      <p className="info-card-heading !mb-3">Address</p>
      <ClientAddressFields
        values={values}
        onChange={onChange}
        disabled={disabled}
        idPrefix={idPrefix}
      />
    </div>
  );
}
