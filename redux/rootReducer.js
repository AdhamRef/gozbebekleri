import { combineReducers } from 'redux';
import authReducer from "./features/auth-slice";
import profileReducer from './authReducer';
import profileSlice from './store/profileSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileSlice
});

export default rootReducer;