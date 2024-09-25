const express = require("express");
const authMiddleware = require("../middlewares/auth");
const Post = require("../models/post");
const User = require("../models/user");
const Notification = require("../models/notification");
const sendPushNotification = require("../services/sendPushNotification");
const router = express.Router();
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

// Criar uma nova postagem
router.post("/createPost", authMiddleware, async (req, res) => {
  const { content, imageUrl } = req.body;
  console.log("Recebendo nova postagem:", { content, imageUrl }); // Log dos dados recebidos

  try {
    const newPost = new Post({
      userId: req.user.id,
      content,
      imageUrl,
    });

    await newPost.save();
    console.log("Postagem criada com sucesso:", newPost); // Log da nova postagem criada
    res.status(201).json(newPost.toObject());
  } catch (error) {
    console.error("Erro ao criar postagem:", error.message);
    res.status(500).json({ msg: "Erro ao criar postagem." });
  }
});

// Listar todas as postagens com paginação
router.get("/posts", authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const posts = await Post.find()
      .populate("userId", ["name", "photoUrl"]) // Popula o usuário da postagem
      .populate("comments.userId", ["name", "photoUrl"]) // Popula o usuário dos comentários
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPosts = await Post.countDocuments();

    const formattedPosts = posts.map((post) => ({
      ...post.toObject(),
      timeAgo: dayjs(post.createdAt).fromNow(),
    }));

    res.json({
      posts: formattedPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    });
  } catch (error) {
    console.error(error.message);
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

    // Popula os campos userId dos comentários sem execPopulate
    await post.populate('comments.userId', 'name photoUrl');

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
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao adicionar comentário." });
  }
});

// Curtir uma postagem
router.post("/likePost", authMiddleware, async (req, res) => {
  const { postId } = req.body;
  console.log(`Curtindo post ${postId}`); // Log ao curtir post

  try {
    const post = await Post.findById(postId);
    if (!post) {
      console.log("Postagem não encontrada:", postId); // Log de erro de post não encontrado
      return res.status(404).json({ msg: "Postagem não encontrada." });
    }

    if (!post.likes.includes(req.user.id)) {
      post.likes.push(req.user.id);
      await post.save();
      console.log("Curtida adicionada:", req.user.id); // Log da curtida adicionada
    } else {
      console.log("Usuário já curtiu a postagem:", req.user.id); // Log de curtida duplicada
      return res.status(400).json({ msg: "Você já curtiu esta postagem." });
    }

    const postAuthor = await User.findById(post.userId);
    if (postAuthor && postAuthor.deviceToken) {
      const message = {
        title: "Nova Curtida!",
        body: `${req.user.name} curtiu sua postagem.`,
      };
      await sendPushNotification(postAuthor.deviceToken, message);
      console.log("Notificação de curtida enviada ao autor do post."); // Log da notificação de curtida
    }

    const notification = new Notification({
      userId: post.userId,
      type: "like",
      content: `${req.user.name} curtiu sua postagem.`,
    });
    await notification.save();
    console.log("Notificação de curtida salva:", notification); // Log da notificação interna de curtida

    res.status(200).json({
      msg: "Curtida adicionada e notificação enviada.",
      post: post.toObject(),
    });
  } catch (error) {
    console.error("Erro ao curtir postagem:", error.message);
    res.status(500).json({ msg: "Erro ao curtir postagem." });
  }
});

module.exports = router;
