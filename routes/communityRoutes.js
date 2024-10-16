const express = require("express");
const authMiddleware = require("../middlewares/auth");
const Post = require("../models/post");
const User = require("../models/user");
const Notification = require("../models/notification");
const sendPushNotification = require("../services/sendPushNotification");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);


const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function uploadImageToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: "image" }, (error, result) => {
        if (error) {
          console.error("Erro no upload para o Cloudinary:", error);
          return reject(error);
        }
        if (!result || !result.secure_url) {
          console.error("Erro: Resposta inesperada do Cloudinary:", result);
          return reject(new Error("Erro ao processar upload no Cloudinary."));
        }
        resolve(result);
      })
      .end(buffer);
  });
}


// Criar uma nova postagem com imagem
router.post("/createPost", authMiddleware, upload.single("image"),
  async (req, res) => {
    const { content } = req.body;
    let uploadedImageUrl;

    try {
      // Verifica se uma imagem foi enviada e faz o upload para o Cloudinary
      if (req.file) {
        const result = await uploadImageToCloudinary(req.file.buffer);
        uploadedImageUrl = result.secure_url; // URL da imagem carregada no Cloudinary
      }

      // Cria a nova postagem com a URL da imagem carregada, se existir
      const newPost = new Post({
        userId: req.user.id,
        content,
        imageUrl: uploadedImageUrl, // Salva a URL da imagem carregada ou undefined se não tiver imagem
      });

      await newPost.save();
      res.status(201).json(newPost.toObject());
    } catch (error) {
      console.error("Erro ao criar postagem:", error.message);
      res.status(500).json({ msg: "Erro ao criar postagem." });
    }
  }
);

// Atualização na função de listar postagens
router.get("/posts", authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const posts = await Post.find()
      .populate("userId", ["name", "photoUrl"])
      .populate("comments.userId", ["name", "photoUrl"])
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPosts = await Post.countDocuments();

    // Modifica o retorno para incluir se o usuário curtiu a postagem
    const formattedPosts = posts.map((post) => ({
      ...post.toObject(),
      timeAgo: dayjs(post.createdAt).fromNow(),
      isLikedByCurrentUser: post.likes.includes(req.user.id), // Indica se o usuário atual curtiu
    }));

    res.json({
      posts: formattedPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    });
  } catch (error) {
    console.error("Erro ao recuperar postagens:", error.message);
    res.status(500).json({ msg: "Erro ao recuperar postagens." });
  }
});

// Adicionar um comentário a uma postagem
router.post("/addComment", authMiddleware, async (req, res) => {
  const { postId, comment } = req.body;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ msg: "Postagem não encontrada." });
    }

    const newComment = {
      userId: req.user.id,
      comment,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    await post.populate("comments.userId", "name photoUrl");

    const postAuthor = await User.findById(post.userId);
    if (postAuthor && postAuthor.deviceToken) {
      const message = {
        title: "Novo Comentário!",
        body: `${req.user.name} comentou na sua postagem.`,
      };
      await sendPushNotification(postAuthor.deviceToken, message);
    }

    const notification = new Notification({
      userId: post.userId,
      type: "comment",
      content: `${req.user.name} comentou na sua postagem.`,
    });
    await notification.save();

    res.status(200).json({
      msg: "Comentário adicionado e notificação enviada.",
      post: post.toObject(),
    });
  } catch (error) {
    res.status(500).json({ msg: "Erro ao adicionar comentário." });
  }
});

// Curtir ou descurtir uma postagem
router.post("/likePost", authMiddleware, async (req, res) => {
  const { postId } = req.body;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ msg: "Postagem não encontrada." });
    }

    const userId = req.user.id;
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Remove a curtida
      post.likes = post.likes.filter((id) => id.toString() !== userId);
      await post.save();
      console.log(`Usuário ${userId} removeu a curtida da postagem ${postId}`);
    } else {
      // Adiciona a curtida
      post.likes.push(userId);
      await post.save();
      console.log(`Usuário ${userId} curtiu a postagem ${postId}`);

      const postAuthor = await User.findById(post.userId);
      if (postAuthor && postAuthor.deviceToken) {
        const message = {
          title: "Nova Curtida!",
          body: `${req.user.name} curtiu sua postagem.`,
        };
        await sendPushNotification(postAuthor.deviceToken, message);
      }
    }

    res.status(200).json({
      msg: isLiked
        ? "Curtida removida."
        : "Curtida adicionada e notificação enviada.",
      post: post.toObject(),
    });
  } catch (error) {
    console.error("Erro ao atualizar curtida da postagem:", error.message);
    res.status(500).json({ msg: "Erro ao atualizar curtida." });
  }
});

module.exports = router;
