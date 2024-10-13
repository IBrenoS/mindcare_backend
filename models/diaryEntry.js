const mongoose = require("mongoose");

// Definindo o esquema de entradas do diário de humor com timestamps
const DiaryEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index para melhorar a performance das consultas
    },
    moodEmoji: {
      type: String,
      required: true,
      // Validação simples para garantir que não seja uma string vazia
      validate: {
        validator: function (v) {
          return v && v.trim().length > 0;
        },
        message: "O emoji do humor é obrigatório.",
      },
    },
    entry: {
      type: String,
      required: true,
      maxlength: 1000, // Limite máximo de caracteres para o texto
    },
  },
  {
    timestamps: true, // Adiciona automaticamente os campos createdAt e updatedAt
  }
);

// Índice composto para consultas por userId e createdAt
DiaryEntrySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("DiaryEntry", DiaryEntrySchema);
