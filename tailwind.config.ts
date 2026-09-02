import type { Config } from 'tailwindcss'

export default {
  content: [],
  theme: {
    extend: {
      colors: {
        washi: '#f5f2eb',
        paper: '#fbf9f3',
        ink: '#2b2b2b',
        vermilion: '#b23c33',
        sepia: '#8a7a5c',
      },
      fontFamily: {
        mincho: ['"Shippori Mincho"', '"Hiragino Mincho ProN"', '"Yu Mincho"', 'serif'],
      },
    },
  },
} satisfies Config
