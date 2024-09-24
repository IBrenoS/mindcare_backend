const mongoose = require("mongoose");

// Definindo o esquema de postagens da comunidade
const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Referência ao autor da postagem
  content: { type: String, required }, // Conteúdo da postagem
  imageUrl: { type: String }, // URL opcional de imagem
  comments: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Autor do comentário
      comment: { type: String, required: true }, // Texto do comentário
      createdAt: { type: Date, default: Date.now }, // Data do comentário
    },
  ],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // IDs de usuários que curtiram a postagem
  createdAt: { type: Date, default: Date.now }, // Data de criação da postagem
});

module.exports = mongoose.model("Post", PostSchema);
