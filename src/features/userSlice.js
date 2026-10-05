import { createSlice } from '@reduxjs/toolkit';

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    user: null,
  },
  reducers: {
    login: (state, action) => {
      state.user = action.payload;
    },
    updateDisplayName: (state, action) => {
      if (state.user) state.user.displayName = action.payload;
    },
    logout: (state) => {
      state.user = null
    }
  },
});

export const { login, logout, updateDisplayName } = userSlice.actions;

export const selectUser = state => state.user.user;

export default userSlice.reducer;
