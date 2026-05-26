module.exports = {
  rootDir: '../..',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/db-tests'],
  testMatch: ['**/*.db.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
<<<<<<< HEAD
    '^.+\\.ts$': 'ts-jest',
=======
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/src/db-tests/tsconfig.json',
      },
    ],
>>>>>>> 7935f159cbe3de36c4b14561982d3e56e5d17a9a
  },
  setupFiles: ['<rootDir>/src/db-tests/jest.db.setup.js'],
  testTimeout: 60000,
};
