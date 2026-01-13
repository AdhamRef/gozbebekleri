import { LOGIN_REQUEST, LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, EMAILCHANGE} from './actionTypes';

// Login action
export const login = (credentials) => {
    return dispatch => {
      dispatch({ type: LOGIN_REQUEST });
  
      // API çağrısı yapın (örneğin, axios ile)
      return axios.post('/api/login', credentials)
        .then(response => {
          dispatch({ type: LOGIN_SUCCESS, payload: response.data });
        })
        .catch(error => {
          dispatch({ type: LOGIN_FAILURE, payload: error.message });
        });
    };
  };

export const emailChange = (email) => ({
  type: EMAILCHANGE,
  payload: email,
});
  
  // Logout action
  export const logout = () => {
    return { type: LOGOUT };
  };