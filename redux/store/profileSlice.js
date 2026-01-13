import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  email: null,
  utoken: null,
  adisoyadi: null,
  paymenttoken: null,
  logstoken: null,
  membertoken: null,
  isAuthenticated: false
};

const authSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    sepetToken: (state,action) => {
      const {paymenttoken} = action.payload;
      state.paymenttoken = paymenttoken;
    },
    login: (state, action) => {
      const {email, utoken, adisoyadi} = action.payload;
      state.email = email;
      state.utoken = utoken;
      state.adisoyadi = adisoyadi;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.email = null;
      state.utoken = null;
      state.adisoyadi = null;
      state.isAuthenticated = false;
    }
  }
});

export const { login, logout, sepetToken } = authSlice.actions;

export default authSlice.reducer;