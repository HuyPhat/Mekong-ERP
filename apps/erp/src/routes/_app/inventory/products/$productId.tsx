import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@mekong-erp/contract';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@mekong-erp/ui';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { useCan } from '../../../../shared/permissions/use-can';
import { useProduct, useUpdateProduct } from '../../../../features/inventory/queries';
import { formatDate } from '../../../../shared/lib/format';

export const Route = createFileRoute('/_app/inventory/products/$productId')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.inventoryRead),
  component: ProductDetailPage,
});

const ProductFormSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  costPrice: z.coerce.number().int().nonnegative(),
  salePrice: z.coerce.number().int().nonnegative(),
  reorderPoint: z.coerce.number().int().nonnegative(),
});
type ProductFormInput = z.input<typeof ProductFormSchema>;
type ProductFormValues = z.output<typeof ProductFormSchema>;

function ProductDetailPage() {
  const { t } = useTranslation();
  const { productId } = Route.useParams();
  const canEdit = useCan(PERMISSIONS.inventoryWrite);
  const { data: product, isLoading, isError } = useProduct(productId);
  const updateMutation = useUpdateProduct();

  // `z.coerce.number()` fields make the form's raw input differ from the resolver's coerced output.
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    ...(product
      ? {
          values: {
            name: product.name,
            category: product.category,
            unit: product.unit,
            costPrice: product.costPrice,
            salePrice: product.salePrice,
            reorderPoint: product.reorderPoint,
          },
        }
      : {}),
  });

  if (isLoading) {
    return <p className="text-muted-foreground">{t('inventory.products.detail.loading')}</p>;
  }
  if (isError || !product) {
    return <p className="text-destructive">{t('inventory.products.detail.notFound')}</p>;
  }

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate({ id: product.id, patch: values });
  });

  const inputClassName =
    'h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50';

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Link
        to="/inventory/products"
        search={{ page: 1, pageSize: 50 }}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('inventory.products.detail.backToList')}
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <p className="text-sm text-muted-foreground">
          {product.sku} ·{' '}
          {t('inventory.products.detail.createdOn', { date: formatDate(product.createdAt) })}
        </p>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t('inventory.products.columns.name')}
          <input {...register('name')} disabled={!canEdit} className={inputClassName} />
          {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t('inventory.products.columns.category')}
          <input {...register('category')} disabled={!canEdit} className={inputClassName} />
          {errors.category && (
            <span className="text-xs text-destructive">{errors.category.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t('inventory.products.columns.unit')}
          <input {...register('unit')} disabled={!canEdit} className={inputClassName} />
          {errors.unit && <span className="text-xs text-destructive">{errors.unit.message}</span>}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            {t('inventory.products.columns.costPrice')}
            <input
              type="number"
              step={1}
              {...register('costPrice')}
              disabled={!canEdit}
              className={inputClassName}
            />
            {errors.costPrice && (
              <span className="text-xs text-destructive">{errors.costPrice.message}</span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t('inventory.products.columns.salePrice')}
            <input
              type="number"
              step={1}
              {...register('salePrice')}
              disabled={!canEdit}
              className={inputClassName}
            />
            {errors.salePrice && (
              <span className="text-xs text-destructive">{errors.salePrice.message}</span>
            )}
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          {t('inventory.products.columns.reorderPoint')}
          <input
            type="number"
            step={1}
            {...register('reorderPoint')}
            disabled={!canEdit}
            className={inputClassName}
          />
          {errors.reorderPoint && (
            <span className="text-xs text-destructive">{errors.reorderPoint.message}</span>
          )}
        </label>

        {canEdit && (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
              {updateMutation.isPending
                ? t('inventory.products.detail.saving')
                : t('inventory.products.detail.save')}
            </Button>
            {updateMutation.isSuccess && !isDirty && (
              <span className="text-sm text-muted-foreground">
                {t('inventory.products.detail.saved')}
              </span>
            )}
            {updateMutation.isError && (
              <span className="text-sm text-destructive">
                {t('inventory.products.detail.saveFailed')}
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
