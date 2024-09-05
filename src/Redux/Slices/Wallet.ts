import { createSlice } from '@reduxjs/toolkit';

export interface walletState {

}

const initialState: walletState = {

};

const walletSlice = createSlice({
	name: 'wallet',
	initialState,
	reducers: {

	},
});

export const { } = walletSlice.actions;
export default walletSlice.reducer;
