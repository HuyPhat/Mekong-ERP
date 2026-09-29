import { faker } from '@faker-js/faker';
import type { Supplier } from '../purchasing-entities';

const COMPANY_TYPES = ['TNHH', 'Cổ Phần', 'TNHH MTV', 'TNHH Thương Mại'];
const COMPANY_WORDS = [
  'Thương Mại',
  'Sản Xuất',
  'Xuất Nhập Khẩu',
  'Phân Phối',
  'Thực Phẩm',
  'Bao Bì',
  'Vật Tư',
  'Công Nghệ Thực Phẩm',
  'Chế Biến',
  'Nông Sản',
];
const BRAND_WORDS = [
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
  'Đồng Tháp',
  'Hậu Giang',
  'Tân Phú',
  'Bình Minh',
  'Thái Bình Dương',
];
const STREETS = [
  'Nguyễn Văn Linh',
  'Lê Văn Việt',
  'Quốc Lộ 1A',
  'Nguyễn Trãi',
  'Hai Bà Trưng',
  'Điện Biên Phủ',
  'Cách Mạng Tháng Tám',
  'Nguyễn Thị Minh Khai',
  'Trường Chinh',
  'Phạm Văn Đồng',
];
const CITIES = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'];
const PHONE_PREFIXES = [
  '090',
  '091',
  '093',
  '096',
  '097',
  '098',
  '032',
  '033',
  '035',
  '070',
  '079',
];
const CREDIT_LIMITS = [
  50_000_000, 100_000_000, 200_000_000, 500_000_000, 1_000_000_000, 2_000_000_000,
];
const PAYMENT_TERMS_DAYS = [15, 30, 45, 60];

export function generateSuppliers(count: number): Supplier[] {
  faker.seed(20260104);
  const suppliers: Supplier[] = [];
  for (let i = 0; i < count; i++) {
    const type = faker.helpers.arrayElement(COMPANY_TYPES);
    const word = faker.helpers.arrayElement(COMPANY_WORDS);
    const brand = faker.helpers.arrayElement(BRAND_WORDS);
    const street = faker.helpers.arrayElement(STREETS);
    const city = faker.helpers.arrayElement(CITIES);
    const houseNumber = faker.number.int({ min: 1, max: 450 });

    suppliers.push({
      id: `sup-${i + 1}`,
      code: `SUP-${String(i + 1).padStart(4, '0')}`,
      name: `Công ty ${type} ${word} ${brand}`,
      taxCode: faker.string.numeric(10),
      address: `${houseNumber} Đường ${street}, ${city}`,
      phone: `${faker.helpers.arrayElement(PHONE_PREFIXES)}${faker.string.numeric(7)}`,
      email: `lienhe@${brand.toLowerCase().replace(/\s+/g, '')}${i + 1}.vn`,
      creditLimit: faker.helpers.arrayElement(CREDIT_LIMITS),
      paymentTermsDays: faker.helpers.arrayElement(PAYMENT_TERMS_DAYS),
      createdAt: faker.date.past({ years: 3 }).toISOString(),
    });
  }
  return suppliers;
}
