// The category/unit vocabulary lives apart from the faker-based generator so
// the app can import it (e.g. for filter option lists) without pulling faker
// into the initial bundle.
export interface CategorySpec {
  name: string;
  units: string[];
  productWords: string[];
  priceRange: [number, number];
}

export const CATEGORIES: CategorySpec[] = [
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

// Single source of truth for the category/unit vocabulary, reused by the
// Products filter UI so the option lists can never drift from what's seeded.
export const PRODUCT_CATEGORIES = CATEGORIES.map((category) => category.name);
export const PRODUCT_UNITS = Array.from(new Set(CATEGORIES.flatMap((category) => category.units)));
