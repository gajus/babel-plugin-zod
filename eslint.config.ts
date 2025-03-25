import auto from 'eslint-config-canonical/auto';

export default [
  ...auto,
  {
    ignores: ['**/dist/', '**/package-lock.json'],
  },
];
