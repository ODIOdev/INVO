export type ClientFormData = {
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  url: string;
  profileImage: string;
};

export const EMPTY_CLIENT_FORM: ClientFormData = {
  clientName: "",
  companyName: "",
  email: "",
  phone: "",
  url: "",
  profileImage: "",
};

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
