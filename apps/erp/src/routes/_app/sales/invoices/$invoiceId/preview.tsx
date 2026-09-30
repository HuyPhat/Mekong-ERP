import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@mekong-erp/ui';
import { PERMISSIONS, vndToWords } from '@mekong-erp/contract';
import { requirePermission } from '../../../../../shared/permissions/guards';
import { formatDate, formatNumber, formatVnd } from '../../../../../shared/lib/format';
import { useProducts } from '../../../../../features/inventory/queries';
import { useCustomerInvoice, useCustomer } from '../../../../../features/sales/queries';
import styles from './preview.module.scss';

export const Route = createFileRoute('/_app/sales/invoices/$invoiceId/preview')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  component: InvoicePreviewPage,
});

const SELLER = {
  name: 'CÔNG TY TNHH THƯƠNG MẠI MEKONG ERP DEMO',
  taxCode: '0312345678',
  address: '268 Đường Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
  phone: '028 1234 5678',
};

function downloadMockXml(invoiceNumber: string, symbol: string, grandTotal: number) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<HDon>\n  <DLHDon>\n    <TTChung>\n      <KHHDon>${symbol}</KHHDon>\n      <SHDon>${invoiceNumber}</SHDon>\n    </TTChung>\n    <NDHDon>\n      <TToan>\n        <TgTTTBSo>${grandTotal}</TgTTTBSo>\n      </TToan>\n    </NDHDon>\n  </DLHDon>\n  <!-- DEMO ONLY — not a real e-invoice XML standard, for portfolio purposes -->\n</HDon>\n`;
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${invoiceNumber}.xml`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function InvoicePreviewPage() {
  const { t } = useTranslation();
  const { invoiceId } = Route.useParams();

  const { data: invoice, isLoading, isError } = useCustomerInvoice(invoiceId);
  const { data: customer } = useCustomer(invoice?.customerId ?? '');
  const { data: productsData } = useProducts({ page: 1, pageSize: 5000 });

  const productsById = useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>();
    for (const product of productsData?.data ?? []) {
      map.set(product.id, { name: product.name, unit: product.unit });
    }
    return map;
  }, [productsData]);

  if (isLoading) {
    return <p className="text-muted-foreground">{t('sales.invoices.detail.loading')}</p>;
  }
  if (isError || !invoice) {
    return <p className="text-destructive">{t('sales.invoices.detail.notFound')}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={styles.actions}>
        <Button asChild variant="outline">
          <Link to="/sales/invoices/$invoiceId" params={{ invoiceId }}>
            {t('sales.invoices.preview.backToInvoice')}
          </Link>
        </Button>
        <Button onClick={() => window.print()}>{t('sales.invoices.preview.printButton')}</Button>
        <Button
          variant="outline"
          onClick={() => downloadMockXml(invoice.number, invoice.symbol, invoice.grandTotal)}
        >
          {t('sales.invoices.preview.downloadXmlButton')}
        </Button>
      </div>

      <div className={styles.demoNotice}>{t('sales.invoices.preview.demoNotice')}</div>

      <div className={styles.sheet}>
        <div className={styles.header}>
          <div>
            <strong>{SELLER.name}</strong>
            <div>{t('sales.invoices.preview.taxCode', { code: SELLER.taxCode })}</div>
            <div>{SELLER.address}</div>
            <div>{SELLER.phone}</div>
          </div>
        </div>

        <div className={styles.title}>
          <h1>{t('sales.invoices.preview.invoiceTitle')}</h1>
          <div className={styles.symbol}>
            {t('sales.invoices.preview.symbolLabel', {
              symbol: invoice.symbol,
              number: invoice.number,
            })}
          </div>
          <div>
            {t('sales.invoices.preview.issueDateLabel', { date: formatDate(invoice.issueDate) })}
          </div>
        </div>

        <dl className={styles.parties}>
          <div>
            <dt>{t('sales.invoices.preview.buyerLabel')}</dt>
            <dd>{invoice.customerName}</dd>
            {customer && (
              <>
                <dt>{t('sales.invoices.preview.taxCodeLabel')}</dt>
                <dd>{customer.taxCode}</dd>
                <dt>{t('sales.invoices.preview.addressLabel')}</dt>
                <dd>{customer.address}</dd>
                <dt>{t('sales.invoices.preview.phoneLabel')}</dt>
                <dd>{customer.phone}</dd>
              </>
            )}
          </div>
        </dl>

        <table>
          <thead>
            <tr>
              <th>{t('sales.invoices.preview.columns.no')}</th>
              <th>{t('sales.invoices.preview.columns.description')}</th>
              <th>{t('sales.invoices.preview.columns.unit')}</th>
              <th>{t('sales.invoices.preview.columns.qty')}</th>
              <th>{t('sales.invoices.preview.columns.unitPrice')}</th>
              <th>{t('sales.invoices.preview.columns.vatRate')}</th>
              <th>{t('sales.invoices.preview.columns.vatAmount')}</th>
              <th>{t('sales.invoices.preview.columns.lineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => {
              const product = productsById.get(line.productId);
              const vatAmount = Math.round(line.lineTotal * (line.vatRate / 100));
              return (
                <tr key={line.id}>
                  <td className={styles.center}>{index + 1}</td>
                  <td>{product?.name ?? line.productId}</td>
                  <td className={styles.center}>{product?.unit ?? ''}</td>
                  <td className={styles.number}>{formatNumber(line.qty)}</td>
                  <td className={styles.number}>{formatVnd(line.unitPrice)}</td>
                  <td className={styles.center}>{line.vatRate}%</td>
                  <td className={styles.number}>{formatVnd(vatAmount)}</td>
                  <td className={styles.number}>{formatVnd(line.lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className={styles.totals}>
          <div>{t('sales.invoices.preview.subtotal', { amount: formatVnd(invoice.subtotal) })}</div>
          <div>{t('sales.invoices.preview.vatTotal', { amount: formatVnd(invoice.vatTotal) })}</div>
          <div className={styles.grand}>
            {t('sales.invoices.preview.grandTotal', { amount: formatVnd(invoice.grandTotal) })}
          </div>
        </div>

        <p className={styles.words}>
          {t('sales.invoices.preview.amountInWords', { words: vndToWords(invoice.grandTotal) })}
        </p>

        <div className={styles.signatures}>
          <div>
            <p>{t('sales.invoices.preview.buyerSignature')}</p>
            <div className={styles.space} />
          </div>
          <div>
            <p>{t('sales.invoices.preview.sellerSignature')}</p>
            <div className={styles.space} />
          </div>
        </div>
      </div>
    </div>
  );
}
