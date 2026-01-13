import { Global } from '@emotion/react'

const Fonts = () => (
  <Global
    styles={`
      @font-face {
          font-family: 'gotham_narrowbook';
          src: url('./fonts/gotham/gothamnarrow-book-webfont.woff2') format('woff2'),
              url('./fonts/gotham/gothamnarrow-book-webfont.woff') format('woff'),
              url('./fonts/gotham/gothamnarrow-book-webfont.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
      }
      /* latin */
      @font-face {
        font-family: 'Gotham Narrow';
        font-style: normal;
        font-weight: 200;
        src: url('./fonts/GothamNarrow-Thin.otf') format('otf');
      }
      /* latin */
      @font-face {
        font-family: 'Gotham Narrow';
        src: url('./fonts/GothamNarrow-Book.otf') format('otf');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'Gotham Narrow';
        src: url('/fonts/GothamNarrow-Medium.otf') format('otf');
        font-weight: 600;
        font-style: normal;
      }
      @font-face {
        font-family: 'Gotham Narrow';
        src: url('/fonts/GothamNarrow-Bold.otf') format('otf');
        font-weight: 700;
        font-style: normal;
      }
      @font-face {
        font-family: 'Gotham Narrow';
        src: url('/fonts/GothamNarrow-Black.otf') format('otf');
        font-weight: 800;
        font-style: normal;
      }
      `}
  />
)

export default Fonts