module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    '@electron-toolkit',
    '@electron-toolkit/eslint-config-prettier',
  ],
  rules: {
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'crlf',
      },
    ],
    'no-unused-vars': 'warn',
    'react/prop-types': 0,
  },
}
