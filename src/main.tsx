import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import './global.scss';
import { Provider } from 'react-redux';
import store from './Redux/Store';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<Provider store={store}>
		<TonConnectUIProvider manifestUrl="https://ipfs.io/ipfs/Qmdi589DA225yYJNZjS87n6Hr5DQNXtvkQTK8ETnF2jyLh">
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</TonConnectUIProvider>
	</Provider>,
);
