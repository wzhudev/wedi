module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleNameMapper: {
    wedi: '<rootDir>/src/index.ts'
  },
  moduleDirectories: ['.', 'src', 'node_modules']
};
