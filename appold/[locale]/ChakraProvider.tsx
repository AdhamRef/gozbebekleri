"use client";  // Bu bileşenin sadece istemci tarafında çalışacağını belirtir.

import { ChakraProvider } from '@chakra-ui/react';
import customTheme from './theme';

export default function ChakraUIProvider({ children }: { children: React.ReactNode }) {
  return <ChakraProvider theme={customTheme}>{children}</ChakraProvider>;
}