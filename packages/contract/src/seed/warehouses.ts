import type { Warehouse } from '../entities';

export function generateWarehouses(): Warehouse[] {
  return [
    {
      id: 'wh-hcm-01',
      code: 'HCM-01',
      name: 'Kho Thủ Đức',
      address: '123 Đường Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh',
    },
    {
      id: 'wh-hcm-02',
      code: 'HCM-02',
      name: 'Kho Bình Tân',
      address: '456 Đường Tên Lửa, Quận Bình Tân, TP. Hồ Chí Minh',
    },
  ];
}
