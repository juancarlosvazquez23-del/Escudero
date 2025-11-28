require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("./models/admin");

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.error(err));

async function createAdmin() {
  try {
    const username = "admin";     // <--- AGREGA UN USUARIO
    const password = "123456";    // <--- CONTRASEÑA QUE QUIERAS

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      username,
      password: hashedPassword
    });

    await admin.save();
    console.log("Administrador creado con éxito!");
    mongoose.connection.close();
  } catch (error) {
    console.error(error);
    mongoose.connection.close();
  }
}

createAdmin();
