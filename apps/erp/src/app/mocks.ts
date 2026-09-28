export async function enableMocking(): Promise<void> {
  const { worker } = await import('@mekong-erp/contract/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
