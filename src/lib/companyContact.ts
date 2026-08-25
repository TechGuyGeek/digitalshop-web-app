export function normalizeWhatsAppNumber(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  return digits;
}

export function buildContactLinks(mobile: string, email: string): { phone: string; sms: string; whatsapp: string; email: string } {
  const normalized = normalizeWhatsAppNumber(mobile);
  return {
    phone: mobile ? `tel:${mobile}` : "",
    sms: mobile ? `sms:${mobile}` : "",
    whatsapp: normalized ? `https://wa.me/${normalized}` : "",
    email: email ? `mailto:${email}` : "",
  };
}
