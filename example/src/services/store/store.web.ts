import { IStoreService } from './store';

export class LocalStoreService implements IStoreService {
  store(namespace: string): any;
  store(namespace: string, data: any): void;
  store(namespace: string, data?: any): void | any {
    if (data) {
      return localStorage.setItem(namespace, JSON.stringify(data));
    } else {
      const store = localStorage.getItem(namespace);
      return (store && JSON.parse(store)) || [];
    }
  }
}
