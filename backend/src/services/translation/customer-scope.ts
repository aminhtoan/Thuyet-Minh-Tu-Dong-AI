import { AsyncLocalStorage } from 'node:async_hooks';
import type { CustomerTranslationMethod } from '../../config/customer-translation-method.js';
// Only normal server composition invokes this, never a client/body flag.
const scope = new AsyncLocalStorage<boolean>();
const modelScope = new AsyncLocalStorage<string>();
const methodScope = new AsyncLocalStorage<CustomerTranslationMethod>();
export const customerScopeActive = () => scope.getStore() === true && process.env.CUSTOMER_TRANSLATION_ENABLED === 'true';
export const withCustomerTranslation = <T>(work: () => Promise<T>) => scope.run(true, work);
// Snapshot the model used in the durable binding through all awaited work.
export const withCustomerModel = <T>(model: string, work: () => Promise<T>) => modelScope.run(model, work);
export const scopedCustomerModel = () => modelScope.getStore();
export const withCustomerMethod = <T>(method: CustomerTranslationMethod, work: () => Promise<T>) => methodScope.run(method, work);
export const scopedCustomerMethod = () => methodScope.getStore();
