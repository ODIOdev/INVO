export type ClientFormData = {
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  url: string;
  profileImage: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
};

export const EMPTY_CLIENT_FORM: ClientFormData = {
  clientName: "",
  companyName: "",
  email: "",
  phone: "",
  url: "",
  profileImage: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
};

export type ClientAddressFields = Pick<
  ClientFormData,
  "addressLine1" | "addressLine2" | "city" | "state" | "zipCode"
>;

export function formatClientAddress(
  address: Partial<ClientAddressFields>
): string {
  const line1 = address.addressLine1?.trim() ?? "";
  const line2 = address.addressLine2?.trim() ?? "";
  const city = address.city?.trim() ?? "";
  const state = address.state?.trim() ?? "";
  const zipCode = address.zipCode?.trim() ?? "";

  const cityStateZip = [city, [state, zipCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return [line1, line2, cityStateZip].filter(Boolean).join("\n");
}

export function hasClientAddress(address: Partial<ClientAddressFields>): boolean {
  return Boolean(formatClientAddress(address));
}

export function formatPhoneNumber(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
