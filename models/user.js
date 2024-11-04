const mongoose = require("mongoose");

// Definindo o esquema do usuário
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  bio: { type: String },
  photoUrl: { type: String },
  role: {
    type: String,
    enum: ["user", "moderator", "admin"],
    default: "user", // Todos os usuários começam como "user" por padrão
  },
  resetPasswordToken: { type: String }, // Campo para armazenar o token de recuperação
  resetPasswordExpires: { type: Date }, // Campo para armazenar a data de expiração
  resetPasswordAttempts: { type: Number, default: 0 }, // Rastreia o número de tentativas
  resetPasswordLockUntil: { type: Date }, // Bloqueia o usuário após múltiplas tentativas
  date: { type: Date, default: Date.now },
  customEmojis: {
    type: [String],
    default: [],
    validate: {
      validator: function (v) {
        return v.length <= 6;
      },
      message: "Você pode personalizar até 6 emojis.",
    },
  },
});

module.exports = mongoose.model("User", UserSchema);
