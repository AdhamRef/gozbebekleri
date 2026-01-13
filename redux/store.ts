import { configureStore } from "@reduxjs/toolkit";
import oturumReducer from './slices/oturumSlice';
import sepetReducer from './slices/sepetSlice';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import { TypedUseSelectorHook, useSelector } from 'react-redux';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['oturum','sepet']
};

const rootReducer = combineReducers({
  oturum: oturumReducer,
  sepet: sepetReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false, }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;