import { faker } from '@faker-js/faker';
import type { Product } from '../entities';

interface CategorySpec {
  name: string;
  units: string[];
  productWords: string[];
  priceRange: [number, number];
}

const CATEGORIES: CategorySpec[] = [
  {
    name: 'Nước giải khát',
    units: ['thùng', 'chai', 'lon'],
    productWords: [
      'Trà đào',
      'Trà xanh',
      'Nước cam ép',
      'Nước suối',
      'Nước tăng lực',
      'Trà atiso',
      'Nước ép táo',
      'Soda chanh',
    ],
    priceRange: [8000, 25000],
  },
  {
    name: 'Thực phẩm khô',
    units: ['gói', 'kg', 'hộp'],
    productWords: [
      'Mì ăn liền',
      'Bún khô',
      'Phở khô',
      'Miến dong',
      'Gạo thơm',
      'Đậu xanh',
      'Bột ngũ cốc',
    ],
    priceRange: [10000, 60000],
  },
  {
    name: 'Bánh kẹo',
    units: ['hộp', 'gói'],
    productWords: [
      'Bánh quy bơ',
      'Kẹo dừa',
      'Bánh trung thu',
      'Snack khoai tây',
      'Kẹo dẻo trái cây',
      'Bánh gạo',
    ],
    priceRange: [12000, 45000],
  },
  {
    name: 'Sữa & chế phẩm',
    units: ['hộp', 'lốc', 'chai'],
    productWords: ['Sữa tươi tiệt trùng', 'Sữa chua uống', 'Sữa đặc', 'Sữa hạt', 'Phô mai lát'],
    priceRange: [15000, 55000],
  },
  {
    name: 'Hóa mỹ phẩm',
    units: ['chai', 'hộp', 'gói'],
    productWords: [
      'Dầu gội',
      'Sữa tắm',
      'Nước rửa chén',
      'Bột giặt',
      'Nước xả vải',
      'Kem đánh răng',
    ],
    priceRange: [20000, 90000],
  },
  {
    name: 'Gia vị',
    units: ['chai', 'gói', 'hộp'],
    productWords: [
      'Nước mắm',
      'Nước tương',
      'Tương ớt',
      'Bột nêm',
      'Dầu ăn',
      'Muối i-ốt',
      'Tiêu xay',
    ],
    priceRange: [9000, 70000],
  },
];

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

// Single source of truth for the category/unit vocabulary, reused by the
// Products filter UI so the option lists can never drift from what's seeded.
export const PRODUCT_CATEGORIES = CATEGORIES.map((category) => category.name);
export const PRODUCT_UNITS = Array.from(new Set(CATEGORIES.flatMap((category) => category.units)));

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
