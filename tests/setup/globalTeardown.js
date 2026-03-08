/**
 * Global Teardown - Se ejecuta UNA VEZ después de todos los tests
 */

module.exports = async () => {
  console.log('\n🧹 [TEARDOWN] Cerrando MongoDB en memoria...');
  
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    console.log('✅ [TEARDOWN] MongoDB en memoria cerrado correctamente');
  }
};
