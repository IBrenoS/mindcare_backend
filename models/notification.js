const mongoose = require("mongoose");

// Definindo o esquema de notificações
const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Usuário que receberá a notificação
  type: { type: String, enum: ["like", "comment"], required: true }, // Tipo de notificação (curtida, comentário)
  content: { type: String }, // Mensagem da notificação (ex: "Fulano comentou na sua postagem")
  isRead: { type: Boolean, default: false }, // Marca se a notificação já foi lida
  createdAt: { type: Date, default: Date.now }, // Data de criação
});

module.exports = mongoose.model("Notification", NotificationSchema);
