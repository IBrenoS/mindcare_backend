const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true // Adicionar índice
  }, // Usuário que receberá a notificação
  type: { type: String, enum: ["like", "comment"], required: true }, // Tipo de notificação
  content: { type: String }, // Mensagem da notificação
  isRead: { type: Boolean, default: false }, // Marca se a notificação já foi lida
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  deletionScheduledAt: { type: Date },
});

// índice composto para consultas comuns
NotificationSchema.index({ userId: 1, isRead: 1 });

// índice para consultas de limpeza
NotificationSchema.index({ deletionScheduledAt: 1, isActive: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
