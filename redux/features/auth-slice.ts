import {createSlice, PayloadAction} from "@reduxjs/toolkit";

type InitialState = {
    value: AuthState;
}

type AuthState = {
    isAuth: boolean;
    username: string,
    uid: string,
    isModerator: boolean,
    sepet: number,

}

const initialState = {
    value: {
        isAuth: false,
        username: "",
        uid: "",
        isModerator: false,
        sepet: 1,
    } as AuthState,
} as InitialState;

export const auth = createSlice({
    name: "auth",
    initialState,
    reducers: {
        logOut: () => {
            return initialState;
        },
        logSepet: (state,action) => {
            state.value.sepet = action.payload;
        }
    }
});

export const {logOut,logSepet} = auth.actions;
export default auth.reducer;