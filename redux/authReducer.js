import { LOGIN_REQUEST, LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, EMAILCHANGE } from './actionTypes';

const initialState = {
  user: null,
  email: "aa@aa.com",
  loading: false,
  error: null
};

const profileReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_REQUEST:
      return { ...state, loading: true, error: null };
    case LOGIN_SUCCESS:
      return { ...state, user: action.payload, loading: false };
    case LOGIN_FAILURE:
      return { ...state, error: action.payload, loading: false };
    case LOGOUT:
      return { ...state, user: null };
    case EMAILCHANGE:
      return {...state, email: action.payload};
    default:
      return state;
  }
};

export default profileReducer;