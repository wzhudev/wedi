import React from 'react';
import ReactDOM from 'react-dom';
import { registerSingleton } from 'wedi';

import App from './App';

import { IStoreService } from './services/store/store';
import { LocalStoreService } from './services/store/store.web';

registerSingleton(IStoreService, LocalStoreService);

ReactDOM.render(<App />, document.getElementsByClassName('todoapp')[0]);
