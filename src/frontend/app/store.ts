import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { foosballApi } from '../apis/foosball/foosball'
import leagueReducer from './leagueSlice'

export const store = configureStore({
    reducer: {
        [foosballApi.reducerPath]: foosballApi.reducer,
        league: leagueReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(foosballApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>

setupListeners(store.dispatch)
