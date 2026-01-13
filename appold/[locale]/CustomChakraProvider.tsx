// app/CustomChakraProvider.tsx
'use client'

import { ChakraProvider } from '@chakra-ui/react'
import Fonts from './Fonts'
import theme from './theme'

export function CustomChakraProvider({ children }: { children: React.ReactNode }) {
  return <ChakraProvider theme={theme}><Fonts />{children}</ChakraProvider>
}