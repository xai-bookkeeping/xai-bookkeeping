type AmountLike = number | { toString(): string };

function toNumber(value: AmountLike): number {
  return typeof value === "number" ? value : Number(value.toString());
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function paidAmount(payments: Array<{ amount: AmountLike; deletedAt?: Date | string | null }>) {
  return roundMoney(
    payments
      .filter((payment) => !payment.deletedAt)
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0),
  );
}

export function outstandingAmount(
  invoiceTotal: AmountLike,
  payments: Array<{ amount: AmountLike; deletedAt?: Date | string | null }>,
) {
  return roundMoney(Math.max(0, toNumber(invoiceTotal) - paidAmount(payments)));
}
