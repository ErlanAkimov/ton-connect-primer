import { Routes, Route } from 'react-router-dom';
import Page from './Page';

function App() {
	return (
		<div className="main">
			<Routes>
				<Route path="/" element={<Page />} />
			</Routes>
		</div>
	);
}

export default App;
