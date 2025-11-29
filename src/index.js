require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB conectado");
    app.listen(4000, () => console.log("Servidor en http://localhost:4000"));
  })
  .catch(err => console.error(err));
