module.exports = {
  rootDir: '../..',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/db-tests'],
  testMatch: ['**/*.db.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/src/db-tests/tsconfig.json',
      },
    ],
  },
  setupFiles: ['<rootDir>/src/db-tests/jest.db.setup.js'],
  testTimeout: 60000,
};
