const mongoose = require("mongoose");

// Definindo o esquema de postagens da comunidade
const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Referência ao autor da postagem
  content: { type: String }, // Conteúdo da postagem (agora obrigatório)
  imageUrl: { type: String }, // URL opcional de imagem
  comments: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      }, // Autor do comentário (agora obrigatório)
      comment: { type: String, required: true }, // Texto do comentário
      createdAt: { type: Date, default: Date.now }, // Data do comentário
    },
  ],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // IDs de usuários que curtiram a postagem
  createdAt: { type: Date, default: Date.now }, // Data de criação da postagem
  updatedAt: { type: Date, default: Date.now }, // Data de atualização da postagem
});

// Hook para atualizar `updatedAt` automaticamente
PostSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Post", PostSchema);
