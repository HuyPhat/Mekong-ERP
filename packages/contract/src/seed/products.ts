import { faker } from '@faker-js/faker';
import type { Product } from '../entities';

import { CATEGORIES } from './product-catalog';

const BRANDS = [
  'Mekong',
  'Cửu Long',
  'Sài Gòn',
  'Phương Nam',
  'Miền Tây',
  'Việt Hương',
  'An Giang',
  'Sông Tiền',
  'Long Xuyên',
  'Cần Thơ',
];

const SIZES = [
  '250ml',
  '500ml',
  '1L',
  '330ml',
  '100g',
  '200g',
  '500g',
  '1kg',
  'loại nhỏ',
  'loại lớn',
];

export function generateProducts(count: number): Product[] {
  faker.seed(20260101);
  const products: Product[] = [];
  for (let i = 0; i < count; i++) {
    const category = faker.helpers.arrayElement(CATEGORIES);
    const productWord = faker.helpers.arrayElement(category.productWords);
    const brand = faker.helpers.arrayElement(BRANDS);
    const size = faker.helpers.arrayElement(SIZES);
    const unit = faker.helpers.arrayElement(category.units);
    const costPrice = faker.number.int({
      min: category.priceRange[0],
      max: category.priceRange[1],
    });
    const markup = faker.number.float({ min: 1.15, max: 1.45 });
    const salePrice = Math.round((costPrice * markup) / 500) * 500;

    products.push({
      id: `prod-${i + 1}`,
      sku: `SKU-${String(i + 1).padStart(5, '0')}`,
      name: `${productWord} ${brand} ${size}`,
      category: category.name,
      unit,
      costPrice,
      salePrice,
      reorderPoint: faker.number.int({ min: 20, max: 200 }),
      createdAt: faker.date.past({ years: 2 }).toISOString(),
    });
  }
  return products;
}
