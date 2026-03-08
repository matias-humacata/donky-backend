/**
 * Jest Configuration for Taller Donky Backend
 * 
 * Configuración para tests de integración con base de datos real de testing
 */

module.exports = {
  // Entorno de ejecución
  testEnvironment: 'node',
  
  // Archivos de setup global
  globalSetup: './tests/setup/globalSetup.js',
  globalTeardown: './tests/setup/globalTeardown.js',
  
  // Setup por archivo de test
  setupFilesAfterEnv: ['./tests/setup/db.js'],
  
  // Patrones de archivos de test
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Ignorar carpetas
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/load/' // k6 no usa Jest
  ],
  
  // Timeout para tests de integración (más largo que unit tests)
  testTimeout: 30000,
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Verbose output
  verbose: true,
  
  // Forzar salida después de tests
  forceExit: true,
  
  // Detectar handles abiertos
  detectOpenHandles: true,
  
  // Ejecutar tests en serie (importante para DB compartida)
  maxWorkers: 1
};
