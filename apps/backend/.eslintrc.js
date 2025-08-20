module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    jest: true,
  },
  rules: {
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-script-url': 'error',
    'no-console': 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Style
    'comma-dangle': ['error', 'always-multiline'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
  },
};