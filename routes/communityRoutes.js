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
      userId: req.user.id, // O ID do usuário autenticado é recuperado do token JWT
      content,
      imageUrl,
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao criar postagem." });
  }
});

// Listar todas as postagens com paginação
router.get("/posts", authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Número da página
  const limit = parseInt(req.query.limit) || 10; // Número de postagens por página

  try {
    // Busca os posts com paginação
    const posts = await Post.find()
      .populate("userId", ["name", "photoUrl"]) // Inclui o nome e a imagem de perfil do usuário
      .sort({ createdAt: -1 }) // Ordena os posts mais recentes primeiro
      .skip((page - 1) * limit) // Pular os posts das páginas anteriores
      .limit(limit); // Limitar o número de posts retornados

    // Contar o número total de postagens (para saber quantas páginas há)
    const totalPosts = await Post.countDocuments();

    // Formatar os posts com o tempo relativo
    const formattedPosts = posts.map((post) => {
      return {
        ...post._doc,
        timeAgo: dayjs(post.createdAt).fromNow(), // Exibe "há 5 minutos", "há 2 dias", etc.
      };
    });

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

    // Busca o nome do usuário que comentou
    const commentingUser = await User.findById(req.user.id);

    res.status(200).json({
      msg: "Comentário adicionado e notificação enviada.",
      comment: {
        userId: {
          id: req.user.id,
          name: commentingUser.name,
        },
        comment: newComment.comment,
        createdAt: newComment.createdAt,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao adicionar comentário." });
  }
});

// Curtir uma postagem
router.post("/likePost", authMiddleware, async (req, res) => {
  const { postId } = req.body; // Removido o userId do body

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ msg: "Postagem não encontrada." });
    }

    // Verifica se o usuário já curtiu a postagem para evitar múltiplas curtidas
    if (!post.likes.includes(req.user.id)) {
      // Adiciona a curtida à postagem utilizando o ID do usuário autenticado
      post.likes.push(req.user.id);
      await post.save();
    } else {
      return res.status(400).json({ msg: "Você já curtiu esta postagem." });
    }

    // Busca o token do autor da postagem
    const postAuthor = await User.findById(post.userId);
    if (postAuthor && postAuthor.deviceToken) {
      const message = {
        title: "Nova Curtida!",
        body: `${req.user.name} curtiu sua postagem.`,
      };
      await sendPushNotification(postAuthor.deviceToken, message);
    }

    // Cria uma notificação interna para o autor da postagem
    const notification = new Notification({
      userId: post.userId,
      type: "like",
      content: `${req.user.name} curtiu sua postagem.`,
    });
    await notification.save();

    res.status(200).json({ msg: "Curtida adicionada e notificação enviada." });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao curtir postagem." });
  }
});

// Listar notificações com paginação
router.get("/list", authMiddleware, async (req, res) => {
  const { filter } = req.query;
  const page = parseInt(req.query.page) || 1; // Número da página
  const limit = parseInt(req.query.limit) || 10; // Número de notificações por página

  try {
    // Definir a data mínima com base no intervalo (opcional)
    let startDate;
    if (filter === "7") {
      startDate = dayjs().subtract(7, "day").toDate(); // Últimos 7 dias
    } else if (filter === "30") {
      startDate = dayjs().subtract(30, "day").toDate(); // Últimos 30 dias
    } else {
      startDate = null; // Se não houver filter, retorna todas as notificações
    }

    // Definir a query MongoDB: se o startDate existir, filtra por data
    const query = { userId: req.user.userId };
    if (startDate) {
      query.createdAt = { $gte: startDate }; // Filtra notificações criadas após o startDate
    }

    // Adicionar a paginação
    const notifications = await Notification.find(query)
      .sort({ type: 1, createdAt: -1 }) // Ordena por notificações mais recentes primeiro
      .skip((page - 1) * limit) // Pular as notificações das páginas anteriores
      .limit(limit); // Limitar o número de notificações retornadas

    // Contar o número total de notificações (opcional, útil para saber quantas páginas há)
    const totalNotifications = await Notification.countDocuments(query);

    res.json({
      notifications,
      currentPage: page,
      totalPages: Math.ceil(totalNotifications / limit),
      totalNotifications,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao listar notificações." });
  }

  // Marcar uma notificação como lida
  router.post("/markAsRead", authMiddleware, async (req, res) => {
    const { notificationId } = req.body;

    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({ msg: "Notificação não encontrada." });
      }

      notification.isRead = true;
      await notification.save();

      res.status(200).json({ msg: "Notificação marcada como lida." });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: "Erro ao marcar notificação como lida." });
    }
  });
});

module.exports = router;
