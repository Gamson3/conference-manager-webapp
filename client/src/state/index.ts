// This file is for global store. If we want to save any state in our global store

import { createSlice } from "@reduxjs/toolkit";

export const initialState = {};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {},
});

export const {} = globalSlice.actions;

export default globalSlice.reducer;
