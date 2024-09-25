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

  try {
    const newPost = new Post({
      userId: req.user.id,
      content,
      imageUrl,
    });

    await newPost.save();
    res.status(201).json(newPost.toObject());
  } catch (error) {
    res.status(500).json({ msg: "Erro ao criar postagem." });
  }
});

// Listar todas as postagens com paginação
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

    // Verifica se o usuário já curtiu a postagem
    const userLikedIndex = post.likes.indexOf(req.user.id);

    if (userLikedIndex === -1) {
      // Se o usuário ainda não curtiu, adiciona a curtida
      post.likes.push(req.user.id);
      console.log(`Usuário ${req.user.id} curtiu a postagem ${postId}.`);
    } else {
      // Se o usuário já curtiu, remove a curtida
      post.likes.splice(userLikedIndex, 1);
      console.log(`Usuário ${req.user.id} removeu a curtida da postagem ${postId}.`);
    }

    await post.save();

    const postAuthor = await User.findById(post.userId);
    if (postAuthor && postAuthor.deviceToken) {
      const message = {
        title: userLikedIndex === -1 ? "Nova Curtida!" : "Curtida Removida!",
        body: `${req.user.name} ${userLikedIndex === -1 ? "curtiu" : "removeu a curtida de"} sua postagem.`,
      };
      await sendPushNotification(postAuthor.deviceToken, message);
    }

    const notification = new Notification({
      userId: post.userId,
      type: userLikedIndex === -1 ? "like" : "unlike",
      content: `${req.user.name} ${userLikedIndex === -1 ? "curtiu" : "removeu a curtida de"} sua postagem.`,
    });
    await notification.save();

    res.status(200).json({
      msg: userLikedIndex === -1 ? "Curtida adicionada e notificação enviada." : "Curtida removida e notificação enviada.",
      post: post.toObject(),
    });
  } catch (error) {
    console.error("Erro ao atualizar curtida da postagem:", error.message);
    res.status(500).json({ msg: "Erro ao atualizar curtida da postagem." });
  }
});


// Rota para remover curtida de uma postagem
router.post("/unlikePost", authMiddleware, async (req, res) => {
  const { postId } = req.body;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ msg: "Postagem não encontrada." });
    }

    // Verifica se o usuário já curtiu a postagem para remover a curtida
    if (post.likes.includes(req.user.id)) {
      post.likes = post.likes.filter(userId => userId.toString() !== req.user.id.toString());
      await post.save();
      console.log("Curtida removida:", req.user.id); // Log da remoção da curtida
    } else {
      return res.status(400).json({ msg: "Você não curtiu esta postagem." });
    }

    res.status(200).json({ msg: "Curtida removida com sucesso.", post: post.toObject() });
  } catch (error) {
    console.error("Erro ao remover curtida:", error.message);
    res.status(500).json({ msg: "Erro ao remover curtida." });
  }
});

module.exports = router;
