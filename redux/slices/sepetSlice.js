import { createSlice } from '@reduxjs/toolkit';

const sepetSlice = createSlice({
  name: 'sepet',
  initialState: {
    sepetsay: 0,
  },
  reducers: {
    sepetArtir: (state) => {
        state.sepetsay += 1;
    },
    sepetAzalt: (state) => {
        state.sepetsay -= 1;
    },
    sepetTemizle: (state) => {
      state.sepetsay = 0;
    },
    sepetBelirle: (state,action) => {
      state.sepetsay = action.payload;
    },
  },
});

export const { sepetArtir, sepetAzalt, sepetTemizle, sepetBelirle } = sepetSlice.actions;
export default sepetSlice.reducer;