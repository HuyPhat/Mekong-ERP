const numberFormatter = new Intl.NumberFormat('vi-VN');
const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export function MoneyCell({ value }: { value: number }) {
  return <span className="block text-right tabular-nums">{vndFormatter.format(value)}</span>;
}

export function NumberCell({ value, unit }: { value: number; unit?: string }) {
  return (
    <span className="block text-right tabular-nums">
      {numberFormatter.format(value)}
      {unit !== undefined && ` ${unit}`}
    </span>
  );
}
