import { describe, expect, it } from 'vitest';
import { generateLightSeedData } from './generate';
import { generateApprovalRules } from './approval-rules';

const data = generateLightSeedData(generateApprovalRules());
const purchaseOrders = new Map(data.procurement.purchaseOrders.map((po) => [po.id, po]));
const leaveRequests = new Map(data.hrm.leaveRequests.map((leave) => [leave.id, leave]));
const suppliers = new Set(data.suppliers.map((supplier) => supplier.id));
const employees = new Set(data.hrm.employees.map((employee) => employee.id));
const approvals = [...data.procurement.approvals, ...data.hrm.approvals];

describe('generateLightSeedData', () => {
  it('is a few hundred records, not the full demo dataset', () => {
    expect(data.products).toHaveLength(200);
    expect(data.suppliers).toHaveLength(30);
    expect(data.procurement.purchaseOrders).toHaveLength(240);
    const total =
      data.products.length +
      data.suppliers.length +
      data.procurement.purchaseOrders.length +
      approvals.length +
      data.hrm.leaveRequests.length +
      data.hrm.employees.length;
    expect(total).toBeLessThan(2_000);
  });

  it('gives every approval step a document that exists', () => {
    for (const step of approvals) {
      const known =
        step.docType === 'purchase_order'
          ? purchaseOrders.has(step.docId)
          : leaveRequests.has(step.docId);
      expect(known, `${step.docType} ${step.docId}`).toBe(true);
    }
  });

  it('gives every purchase order a supplier and every leave request an employee it can show', () => {
    for (const po of data.procurement.purchaseOrders)
      expect(suppliers.has(po.supplierId)).toBe(true);
    for (const leave of data.hrm.leaveRequests) expect(employees.has(leave.employeeId)).toBe(true);
  });

  it('has something to decide for every approver role, in both document types', () => {
    const pending = approvals.filter((step) => step.status === 'pending');
    for (const role of ['approver_manager', 'approver_finance', 'approver_director']) {
      const forRole = pending.filter((step) => step.approverRole === role);
      expect(forRole.length, `pending steps for ${role}`).toBeGreaterThan(0);
    }
    expect(pending.some((step) => step.docType === 'purchase_order')).toBe(true);
    expect(pending.some((step) => step.docType === 'leave_request')).toBe(true);
  });

  it('is the same data every time', () => {
    const again = generateLightSeedData(generateApprovalRules());
    expect(again.procurement.purchaseOrders.map((po) => po.number)).toEqual(
      data.procurement.purchaseOrders.map((po) => po.number),
    );
    expect(again.hrm.leaveRequests.map((leave) => leave.number)).toEqual(
      data.hrm.leaveRequests.map((leave) => leave.number),
    );
  });
});
