module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/app/config/',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'app/**/*.js',
    '!app/config/**',
    '!app/models/index.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};

