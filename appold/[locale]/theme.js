import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
 
  colors:{
    maincolor: "#cd8b2c",
    secondcolor: "#9c311d",
    burakmavisi: {
      text: '#c78225', 
      50: '#c78225',
      100: '#c78225',
      500: '#c78225',
      600: '#89530b',
      700: '#653c06',
    }
  },
  radii: {
    burakradi: '25px',
  }
})

export default theme