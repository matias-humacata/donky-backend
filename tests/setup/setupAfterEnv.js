/**
 * Setup After Environment - Jest
 * Se ejecuta después de configurar el entorno, antes de cada archivo de test
 */

const mongoose = require('mongoose');

// Timeout extendido para operaciones de DB
jest.setTimeout(30000);

// Conectar a MongoDB antes de todos los tests
beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    throw new Error('MONGO_URI no definida. ¿Se ejecutó globalSetup?');
  }

  await mongoose.connect(mongoUri);
});

// Limpiar colecciones después de cada test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Desconectar después de todos los tests
afterAll(async () => {
  await mongoose.connection.close();
});
