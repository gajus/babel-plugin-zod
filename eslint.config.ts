import auto from 'eslint-config-canonical/dist/configurations/auto';

export default [
  ...auto,
  {
    ignores: ['**/dist/', '**/package-lock.json'],
  },
];
