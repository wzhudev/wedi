import { createIdentifier } from 'wedi';

export interface IStoreService {
  store(namespace: string): any;
  store(namespace: string, data: any): void;
}

export const IStoreService = createIdentifier<IStoreService>('store');
