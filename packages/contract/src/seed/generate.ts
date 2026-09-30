import type { ApprovalRule } from '../approval-entities';
import { generateWarehouses } from './warehouses';
import { generateProducts } from './products';
import { generateStockMovements } from './stock-movements';
import { generateSuppliers } from './suppliers';
import { generatePurchaseOrderDrafts } from './purchase-orders';
import { generateProcurementData } from './procurement';
import { generateCustomers } from './customers';
import { generateSalesOrderDrafts } from './sales-orders';
import { generateStandaloneQuotationDrafts } from './quotations';
import { generateCommerceData } from './commerce';
import { generateHrmData } from './hrm';

const PRODUCT_COUNT = 3000;
const MOVEMENT_COUNT = 100_000;
const SUPPLIER_COUNT = 150;
const PURCHASE_ORDER_COUNT = 1500;
const CUSTOMER_COUNT = 400;
const SALES_ORDER_COUNT = 2000;
const STANDALONE_QUOTATION_COUNT = 600;

export function generateSeedData(approvalRules: ApprovalRule[]) {
  const warehouses = generateWarehouses();
  const products = generateProducts(PRODUCT_COUNT);
  const randomMovements = generateStockMovements(products, warehouses, MOVEMENT_COUNT);

  const suppliers = generateSuppliers(SUPPLIER_COUNT);
  const poDrafts = generatePurchaseOrderDrafts(
    PURCHASE_ORDER_COUNT,
    products,
    suppliers,
    warehouses,
  );
  const procurement = generateProcurementData(poDrafts, approvalRules);

  const customers = generateCustomers(CUSTOMER_COUNT);
  const soDrafts = generateSalesOrderDrafts(SALES_ORDER_COUNT, products, customers, warehouses);
  const standaloneQuotationDrafts = generateStandaloneQuotationDrafts(
    STANDALONE_QUOTATION_COUNT,
    products,
    customers,
    warehouses,
  );
  const commerce = generateCommerceData(soDrafts, standaloneQuotationDrafts, products, customers);

  // Last, so the data above is unchanged by it.
  const hrm = generateHrmData(approvalRules);

  return {
    warehouses,
    products,
    randomMovements,
    suppliers,
    procurement,
    customers,
    commerce,
    hrm,
  };
}
