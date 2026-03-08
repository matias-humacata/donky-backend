/**
 * Global Setup - Se ejecuta UNA VEZ antes de todos los tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  console.log('\n🔧 [SETUP] Iniciando MongoDB en memoria para tests...');
  
  // Crear instancia de MongoDB en memoria
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'donky_test',
    },
  });

  // Guardar URI en variable global para usar en tests
  const uri = mongod.getUri();
  process.env.MONGO_URI_TEST = uri;
  
  // Guardar referencia para teardown
  global.__MONGOD__ = mongod;
  
  console.log(`✅ [SETUP] MongoDB en memoria iniciado: ${uri}`);
};
