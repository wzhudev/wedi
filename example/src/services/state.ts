import { Subject } from 'rxjs';
import { Need } from 'wedi';

import { RouterService } from './router';

export enum SHOWING {
  ALL_TODOS,
  ACTIVE_TODOS,
  COMPLETED_TODOS
}

export class StateService {
  nowShowing: SHOWING = SHOWING.ALL_TODOS;
  editing?: string;
  updated$ = new Subject<void>();

  constructor(@Need(RouterService) private routerService: RouterService) {
    this.routerService.router$.subscribe((router) => {
      this.nowShowing =
        router === '/active'
          ? SHOWING.ACTIVE_TODOS
          : router === '/completed'
          ? SHOWING.COMPLETED_TODOS
          : SHOWING.ALL_TODOS;
      this.updated$.next();
    });
  }

  setEditing(id: string): void {
    this.editing = id;
    this.update();
  }

  private update(): void {
    this.updated$.next();
  }
}
