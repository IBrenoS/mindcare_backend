const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const validator = require("validator");
const authMiddleware = require("../middlewares/auth");
const User = require("../models/user");
const { sendPasswordResetEmail } = require("../services/sendGrid");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");


const router = express.Router();

// Configuração do multer para armazenar arquivos temporariamente na memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }); // Middleware de upload

async function uploadImageToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: "image" }, (error, result) => {
        if (error) {
          console.error("Erro no upload para o Cloudinary:", error); // Log detalhado do erro
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

// Registro de usuário
router.post("/register", upload.single("image"), // Adicionando o upload no registro de usuário
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("passwordConfirmation").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
      return true;
    }),
    body("phone").notEmpty().isMobilePhone(),
    body("role")
      .optional()
      .isIn(["user", "moderator", "admin"])
      .withMessage("Invalid role"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, role } = req.body;

    try {
      // Verificar se o usuário já existe
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: "Usuário já existe." });
      }

      // Criptografar a senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Inicializa o novo usuário
      user = new User({
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || "user", // Se o role não for especificado, define como 'user'
      });

      // Se o usuário enviou uma foto, faz upload para o Cloudinary
      if (req.file) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream({ resource_type: "image" }, (error, result) => {
              if (error) return reject(error);
              resolve(result);
            })
            .end(req.file.buffer);
        });
        user.photoUrl = result.secure_url; // Armazena a URL da foto de perfil
      }

      // Salvar o novo usuário no banco de dados
      await user.save();

      // Gerar token JWT contendo o userId e a role
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "12h" }
      );

      res.json({ msg: "Usuário registrado com sucesso.", token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Erro no servidor");
    }
  }
);

// Login de usuário
router.post("/login", [body("email").isEmail(), body("password").exists()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({ msg: "Usuário não encontrado." });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ msg: "Senha incorreta." });

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "12h",
        }
      );
      res.json({ msg: "Login bem-sucedido", token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Erro no servidor");
    }
  }
);

// Perfil do usuário
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Remove o campo de senha na resposta
    if (!user) {
      return res.status(404).json({ msg: "Usuário não encontrado" });
    }
    res.json(user); // Retorna os dados do usuário
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro no servidor" });
  }
});

// Atualização do perfil do usuário
router.put("/profile", authMiddleware, upload.single("image"),
  async (req, res) => {
    const { name, bio, phone, email, password, newPassword } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: "Usuário não encontrado" });
      }

      // Atualiza os campos permitidos
      if (name) user.name = name;
      if (bio) user.bio = bio;
      if (phone) user.phone = phone;

      // Se houver uma nova foto de perfil, faz o upload no Cloudinary
      if (req.file) {
        const result = await uploadImageToCloudinary(req.file.buffer);
        user.photoUrl = result.secure_url; // Atualiza a URL da foto de perfil
        console.log("Url da foto salva:", user.photoUrl);
      }

      // Atualização do email
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ msg: "Este email já está em uso." });
        }
        user.email = email;
      }

      // Atualização da senha
      if (password && newPassword) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ msg: "Senha atual incorreta" });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
      }

      // Salva as mudanças no banco de dados
      await user.save();
      console.log("Perfil atualizado com sucesso");

      res.json({
        msg: "Perfil atualizado com sucesso",
        photoUrl: user.photoUrl,
      });
    } catch (error) {
      console.error("Erro ao atualizar o perfil:", error);
      res.status(500).json({ msg: "Erro ao atualizar o perfil." });
    }
  }
);

function safeNormalizeEmail(email) {
  // Converte o e-mail para minúsculas e remove espaços
  return email.toLowerCase().trim();
}

// Rota para solicitação de recuperação de senha
router.post("/forgotPassword", async (req, res) => {
  let { email } = req.body;

  try {
    // Aplica a normalização segura
    email = safeNormalizeEmail(email);

    // Validação do e-mail após a normalização segura
    if (!validator.isEmail(email)) {
      return res.status(400).json({ msg: "E-mail inválido." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Retorna uma mensagem genérica para evitar exposição
      return res
        .status(200)
        .json({
          msg: "Se o e-mail estiver cadastrado, um código de verificação será enviado.",
        });
    }

    // Gera o código de verificação de 6 dígitos
    const verificationCode = generateRandomCode();

    // Hash do código de verificação
    const hashedCode = await bcrypt.hash(verificationCode, 10);

    // Armazena o hash do código de verificação e o tempo de expiração (10 minutos)
    user.resetPasswordToken = hashedCode;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Expira em 10 minutos
    user.resetPasswordAttempts = 0; // Reseta as tentativas
    await user.save();

    // Envia o código de verificação por e-mail via SendGrid
    await sendPasswordResetEmail(user.email, verificationCode);

    res
      .status(200)
      .json({
        msg: "Se o e-mail estiver cadastrado, um código de verificação será enviado.",
      });
  } catch (error) {
    console.error("Erro ao solicitar recuperação de senha:", error.message);
    res.status(500).json({ msg: "Erro ao solicitar recuperação de senha." });
  }
});

// Função para gerar um código de 6 dígitos
function generateRandomCode() {
  return crypto.randomInt(100000, 999999).toString();
}

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // Bloqueia por 15 minutos após exceder as tentativas

// Rota para verificação do código de recuperação
router.post("/verifyCode", async (req, res) => {
  let { email, code } = req.body;

  try {
    // Verificação inicial de entrada
    if (!email || !code) {
      return res
        .status(400)
        .json({ msg: "E-mail e código de verificação são obrigatórios." });
    }

    // Validação do e-mail sem normalização neste ponto para evitar alterações indesejadas
    if (!validator.isEmail(email)) {
      return res.status(400).json({ msg: "E-mail inválido." });
    }

    // Garantir que o código tenha exatamente 6 caracteres numéricos
    if (!validator.isLength(code, { min: 6, max: 6 }) || !/^\d+$/.test(code)) {
      return res.status(400).json({ msg: "Código de verificação inválido." });
    }

    // Normalização segura do e-mail após a validação
    email = safeNormalizeEmail(email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "Usuário não encontrado." });
    }

    if (isUserLocked(user)) {
      return res.status(423).json({
        msg: "Muitas tentativas falhas. Tente novamente mais tarde.",
      });
    }

    if (isCodeExpired(user)) {
      return res.status(400).json({
        msg: "O código de verificação expirou. Solicite um novo código.",
      });
    }

    // Verifica se o código é válido sem alterar seu valor original
    if (!(await isCodeValid(user, code))) {
      await handleInvalidCode(user);
      return res.status(400).json({ msg: "Código de verificação inválido." });
    }

    await handleValidCode(user);
    res.status(200).json({
      msg: "Código verificado com sucesso. Você pode redefinir sua senha agora.",
    });
  } catch (error) {
    console.error("Erro ao verificar o código:", error.message);
    res.status(500).json({ msg: "Erro ao verificar o código." });
  }
});

function isUserLocked(user) {
  return user.resetPasswordLockUntil && user.resetPasswordLockUntil > Date.now();
}

function isCodeExpired(user) {
  return !user.resetPasswordExpires || user.resetPasswordExpires < Date.now();
}

async function isCodeValid(user, code) {
  return await bcrypt.compare(code, user.resetPasswordToken);
}

async function handleInvalidCode(user) {
  user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
  if (user.resetPasswordAttempts >= MAX_ATTEMPTS) {
    user.resetPasswordLockUntil = Date.now() + LOCK_TIME;
  }
  await user.save();
}

async function handleValidCode(user) {
  user.resetPasswordAttempts = 0;
  await user.save();
}

// Rota para redefinição de senha
router.post("/resetPassword", async (req, res) => {
  let { email, code, newPassword } = req.body;

  try {
    // Validação inicial dos inputs
    if (!email || !code || !newPassword) {
      return res.status(400).json({ msg: "Todos os campos são obrigatórios." });
    }

    // Validação do e-mail sem sanitização para preservar o formato original
    if (!validator.isEmail(email)) {
      return res.status(400).json({ msg: "E-mail inválido." });
    }

    // Verificação se o código tem exatamente 6 caracteres numéricos
    if (!validator.isLength(code, { min: 6, max: 6 }) || !/^\d+$/.test(code)) {
      return res.status(400).json({ msg: "Código de verificação inválido." });
    }

    // Validação da nova senha: deve ter ao menos 6 caracteres
    if (!validator.isLength(newPassword, { min: 6 })) {
      return res
        .status(400)
        .json({ msg: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    // Normalização segura do e-mail após validação
    email = safeNormalizeEmail(email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "Usuário não encontrado." });
    }

    const userError = await validateUserForReset(user, code);
    if (userError) {
      return res.status(userError.status).json({ msg: userError.msg });
    }

    // Atualiza a senha do usuário
    await updateUserPassword(user, newPassword);

    res.status(200).json({ msg: "Senha redefinida com sucesso." });
  } catch (error) {
    console.error("Erro ao redefinir a senha:", error.message);
    res.status(500).json({ msg: "Erro ao redefinir a senha." });
  }
});

// Função para validação do usuário antes da redefinição da senha
async function validateUserForReset(user, code) {
  if (isUserLocked(user)) {
    return {
      status: 423,
      msg: "Muitas tentativas falhas. Tente novamente mais tarde.",
    };
  }

  if (isCodeExpired(user)) {
    return {
      status: 400,
      msg: "O código de verificação expirou. Solicite um novo código.",
    };
  }

  // Verifica se o código é válido comparando o hash
  if (!(await isCodeValid(user, code))) {
    await handleInvalidCode(user);
    return { status: 400, msg: "Código de verificação inválido." };
  }

  return null;
}

async function updateUserPassword(user, newPassword) {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.resetPasswordAttempts = 0;
  user.resetPasswordLockUntil = undefined;

  await user.save();
}

function isUserLocked(user) {
  return user.resetPasswordLockUntil && user.resetPasswordLockUntil > Date.now();
}

function isCodeExpired(user) {
  return !user.resetPasswordExpires || user.resetPasswordExpires < Date.now();
}

async function isCodeValid(user, code) {
  return await bcrypt.compare(code, user.resetPasswordToken);
}

async function handleInvalidCode(user) {
  user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
  if (user.resetPasswordAttempts >= MAX_ATTEMPTS) {
    user.resetPasswordLockUntil = Date.now() + LOCK_TIME;
  }
  await user.save();
}

async function handleValidCode(user) {
  user.resetPasswordAttempts = 0;
  await user.save();
}

// Rota para upload de imagem
router.post("/upload", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    // Verifica se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ msg: "Nenhuma imagem foi enviada." });
    }

    // Faz o upload da imagem para o Cloudinary
    const result = await uploadImageToCloudinary(req.file.buffer);

    // Atualiza o campo photoUrl do usuário logado
    const user = await User.findById(req.user.id); // Pega o usuário autenticado
    if (!user) {
      return res.status(404).json({ msg: "Usuário não encontrado." });
    }

    user.photoUrl = result.secure_url; // Atualiza a URL da foto de perfil
    await user.save(); // Salva as alterações no banco de dados

    res.json({ msg: "Foto de perfil atualizada com sucesso.", secure_url: user.photoUrl });
  } catch (error) {
    console.error("Erro ao fazer upload da imagem:", error);
    res.status(500).json({ msg: "Erro ao fazer upload da imagem. Tente novamente." });
  }
});

router.get("/validate-token", authMiddleware, (req, res) => {

  res.status(200).json({ message: "Token válido", user: req.user });
});

module.exports = router;
