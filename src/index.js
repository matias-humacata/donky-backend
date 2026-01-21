process.env.TZ = process.env.TZ || "America/Argentina/Buenos_Aires";


require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');

// Validar variables de entorno requeridas
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: Falta la variable MONGO_URI en el archivo .env");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("❌ ERROR: Falta la variable JWT_SECRET en el archivo .env");
  console.error("⚠️  JWT_SECRET es requerido para la autenticación.");
  process.exit(1);
}

// Puerto configurable
const PORT = process.env.PORT || 4000;

console.log("⏳ Conectando a MongoDB...");

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,  // tiempo de espera
  connectTimeoutMS: 5000,
})
  .then(() => {
    console.log("✅ MongoDB conectado correctamente");

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor funcionando en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ ERROR al conectar con MongoDB:");
    console.error(err.message);
    process.exit(1); // importante: cortar si no conecta
  });

// Eventos útiles
mongoose.connection.on('disconnected', () => {
  console.warn("⚠️ MongoDB desconectado");
});

mongoose.connection.on('reconnected', () => {
  console.log("🔄 MongoDB reconectado");
});

