import type { InvoiceLineInput } from "@/lib/invoice-validations";

export type CalculatedInvoiceLine = InvoiceLineInput & {
  lineSubtotal: number;
  lineVat: number;
  lineTotal: number;
  sortOrder: number;
};

export type CalculatedInvoice = {
  lines: CalculatedInvoiceLine[];
  subtotal: number;
  vatTotal: number;
  total: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateInvoice(lines: InvoiceLineInput[]): CalculatedInvoice {
  const calculated = lines.map((line, index) => {
    const lineSubtotal = roundMoney(line.quantity * line.unitPrice);
    const lineVat = roundMoney(lineSubtotal * ((line.vatRate ?? 5) / 100));
    return {
      ...line,
      vatRate: line.vatRate ?? 5,
      lineSubtotal,
      lineVat,
      lineTotal: roundMoney(lineSubtotal + lineVat),
      sortOrder: index,
    };
  });

  const subtotal = roundMoney(calculated.reduce((sum, line) => sum + line.lineSubtotal, 0));
  const vatTotal = roundMoney(calculated.reduce((sum, line) => sum + line.lineVat, 0));

  return {
    lines: calculated,
    subtotal,
    vatTotal,
    total: roundMoney(subtotal + vatTotal),
  };
}
