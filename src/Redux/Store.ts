import { configureStore } from "@reduxjs/toolkit";
import walletReducer, {walletState} from './Slices/Wallet';

const store = configureStore({
	reducer: {
		wallet: walletReducer,

	}
})

export type RootState = {
	wallet: walletState
}
export type AppDispatch = typeof store.dispatch;
export default store;