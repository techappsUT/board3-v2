module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Basic security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-script-url': 'error',
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-alert': 'error',
    
    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Style - simplified rules
    'comma-dangle': ['error', 'always-multiline'],
    'semi': ['error', 'always'],
  },
  overrides: [
    {
      files: ['*.config.js', '*.config.ts', 'next.config.js'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
    {
      files: ['**/pages/**/*.tsx', '**/app/**/*.tsx'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
  ],
};