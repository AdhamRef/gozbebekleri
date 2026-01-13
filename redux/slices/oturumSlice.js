import { createSlice } from '@reduxjs/toolkit';

const oturumSlice = createSlice({
  name: 'oturum',
  initialState: {
    name: '',
    email: '',
    mtoken: '',
    gsm: '',
    paymenttoken: '',
    membertoken: '',
    membertype: '1',
    oturumdurumu: false,
    parabirimi:"0",
  },
  reducers: {
    oturumGuncelle: (state,action) => {
      if (action.payload.name !== undefined) state.name = action.payload.name;
      if (action.payload.email !== undefined) state.email = action.payload.email;
      if (action.payload.mtoken !== undefined) state.mtoken = action.payload.mtoken;
      if (action.payload.gsm !== undefined) state.gsm = action.payload.gsm;
      if (action.payload.paymenttoken !== undefined) state.paymenttoken = action.payload.paymenttoken;
      if (action.payload.membertoken !== undefined) state.membertoken = action.payload.membertoken;
      if (action.payload.membertype !== undefined) state.membertype = action.payload.membertype;
      if (action.payload.oturumdurumu !== undefined) state.oturumdurumu = action.payload.oturumdurumu;
      if (action.payload.parabirimi !== undefined) state.parabirimi = action.payload.parabirimi;
    },
    oturumKapat: (state) => {
      state.name = '';
      state.email = '';
      state.mtoken = '';
      state.gsm = '';
      state.paymenttoken = '';
      state.membertoken = '';
      state.membertype = '';
      state.oturumdurumu = false;
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    },
    hydrate: (state, action) => {
      // localStorage'dan gelen veriyi slice'a ekleyin
      state.name = action.payload.name || state.name;
      state.email = action.payload.email || state.email;
      state.mtoken = action.payload.mtoken || state.mtoken;
      state.gsm = action.payload.gsm || state.gsm;
      state.paymenttoken = action.payload.paymenttoken || state.paymenttoken;
      state.membertoken = action.payload.membertoken || state.membertoken;
      state.membertype = action.payload.membertype || state.membertype;
      state.oturumdurumu = action.payload.oturumdurumu || state.oturumdurumu;
      state.parabirimi = action.payload.parabirimi || state.parabirimi;
    },
  },
});

export const { oturumGuncelle, oturumKapat,hydrate  } = oturumSlice.actions;
export default oturumSlice.reducer;