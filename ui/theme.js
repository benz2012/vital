import { createTheme } from '@mui/material/styles'

const root = document.querySelector(':root')
root.style.setProperty('color-scheme', 'dark')

const defaultTheme = createTheme()

const theme = createTheme({
  palette: {
    mode: 'dark',

    background: {
      default: '#1E1E1E',
      paper: '#1E1E1E',
      headerPaper: '#BCCBCC',
    },

    primary: {
      dark: '#16A7B3',
      main: '#51CCD3',
      light: '#B2EAEB',
      contrastText: '#fff',
    },

    secondary: {
      dark: '#107BD5',
      main: '#00AFFF',
      light: '#B4E7FF',
      // opacity variations
      dark25: '#107BD540',
    },

    // augmentColor is a step that Material-UI automatically does for the standard palette colors.
    tertiary: defaultTheme.palette.augmentColor({
      color: {
        dark: '#16B36F',
        main: '#6DCA9A',
        light: '#C1E7D2',
      },
      name: 'tertiary',
    }),

    plain: defaultTheme.palette.augmentColor({
      color: {
        dark: '#BBBBBB',
        main: '#DDDDDD',
        light: '#FFFFFF',
      },
      name: 'plain',
    }),
  },

  spacing: 12,
  shape: {
    borderRadius: 12,
  },

  typography: {
    fontFamily: "'Ubuntu', sans-serif",
    monoFamily: "'Sometype Mono Variable', monopace",
  },
})

const blackPixelToTheme = {
  palette: {
    primary: {
      dark: 'invert(57%) sepia(26%) saturate(5732%) hue-rotate(147deg) brightness(93%) contrast(83%)',
    },
  },
}

export { blackPixelToTheme }
export default theme
