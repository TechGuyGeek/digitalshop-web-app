interface StatusRowProps {
  label: string;
  value: string;
  testId: string;
}

export function StatusRow({ label, value, testId }: StatusRowProps) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 text-sm" data-testid={testId}>
    <span className="font-semibold text-foreground">{label}</span>
    <span className="text-right text-foreground">{value}</span>
  </div>;
}

interface OrderStatusRowsProps {
  paymentLabel: string;
  paymentValue: string;
  deliveryLabel: string;
  deliveryValue: string;
}

export function OrderStatusRows({ paymentLabel, paymentValue, deliveryLabel, deliveryValue }: OrderStatusRowsProps) {
  return <div className="space-y-2">
    <StatusRow label={paymentLabel} value={paymentValue} testId="payment-status" />
    <StatusRow label={deliveryLabel} value={deliveryValue} testId="delivery-status" />
  </div>;
}
