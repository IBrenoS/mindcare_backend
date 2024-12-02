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
const DiaryEntry = require("../models/diaryEntry");
const Post = require("../models/post");
const Notification = require("../models/notification");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

class AuthController {
  static async register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, role } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: "Usuário já existe." });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = new User({
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || "user",
      });

      if (req.file) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream({ resource_type: "image" }, (error, result) => {
              if (error) return reject(error);
              resolve(result);
            })
            .end(req.file.buffer);
        });
        user.photoUrl = result.secure_url;
      }

      await user.save();

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


  static async login(req, res) {
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
        { expiresIn: "12h" }
      );
      res.json({ msg: "Login bem-sucedido", token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Erro no servidor");
    }
  }


  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(404).json({ msg: "Usuário não encontrado" });
      }
      res.json(user);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: "Erro no servidor" });
    }
  }


  static async updateProfile(req, res) {
    const { name, bio, phone, email, password, newPassword } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: "Usuário não encontrado" });
      }

      if (name) user.name = name;
      if (bio) user.bio = bio;
      if (phone) user.phone = phone;

      if (req.file) {
        const result = await Utils.uploadImageToCloudinary(req.file.buffer);
        user.photoUrl = result.secure_url;
      }

      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ msg: "Este email já está em uso." });
        }
        user.email = email;
      }

      if (password && newPassword) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ msg: "Senha atual incorreta" });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
      }

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


  static async forgotPassword(req, res) {
    let { email } = req.body;

    try {
      email = Utils.safeNormalizeEmail(email);

      if (!validator.isEmail(email)) {
        return res.status(400).json({ msg: "E-mail inválido." });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(200)
          .json({
            msg: "Se o e-mail estiver cadastrado, um código de verificação será enviado.",
          });
      }

      const verificationCode = Utils.generateRandomCode();
      const hashedCode = await bcrypt.hash(verificationCode, 10);

      user.resetPasswordToken = hashedCode;
      user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
      user.resetPasswordAttempts = 0;
      await user.save();

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
  }


  static async verifyCode(req, res) {
    let { email, code } = req.body;

    try {
      if (!email || !code) {
        return res
          .status(400)
          .json({ msg: "E-mail e código de verificação são obrigatórios." });
      }

      if (!validator.isEmail(email)) {
        return res.status(400).json({ msg: "E-mail inválido." });
      }

      if (!validator.isLength(code, { min: 6, max: 6 }) || !/^\d+$/.test(code)) {
        return res.status(400).json({ msg: "Código de verificação inválido." });
      }

      email = Utils.safeNormalizeEmail(email);

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ msg: "Usuário não encontrado." });
      }

      if (Utils.isUserLocked(user)) {
        return res.status(423).json({
          msg: "Muitas tentativas falhas. Tente novamente mais tarde.",
        });
      }

      if (Utils.isCodeExpired(user)) {
        return res.status(400).json({
          msg: "O código de verificação expirou. Solicite um novo código.",
        });
      }

      if (!(await Utils.isCodeValid(user, code))) {
        await Utils.handleInvalidCode(user);
        return res.status(400).json({ msg: "Código de verificação inválido." });
      }

      await Utils.handleValidCode(user);
      res.status(200).json({
        msg: "Código verificado com sucesso. Você pode redefinir sua senha agora.",
      });
    } catch (error) {
      console.error("Erro ao verificar o código:", error.message);
      res.status(500).json({ msg: "Erro ao verificar o código." });
    }
  }


  static async resetPassword(req, res) {
    let { email, code, newPassword } = req.body;

    try {
      if (!email || !code || !newPassword) {
        return res.status(400).json({ msg: "Todos os campos são obrigatórios." });
      }

      if (!validator.isEmail(email)) {
        return res.status(400).json({ msg: "E-mail inválido." });
      }

      if (!validator.isLength(code, { min: 6, max: 6 }) || !/^\d+$/.test(code)) {
        return res.status(400).json({ msg: "Código de verificação inválido." });
      }

      if (!validator.isLength(newPassword, { min: 6 })) {
        return res
          .status(400)
          .json({ msg: "A nova senha deve ter pelo menos 6 caracteres." });
      }

      email = Utils.safeNormalizeEmail(email);

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ msg: "Usuário não encontrado." });
      }

      const userError = await Utils.validateUserForReset(user, code);
      if (userError) {
        return res.status(userError.status).json({ msg: userError.msg });
      }

      await Utils.updateUserPassword(user, newPassword);

      res.status(200).json({ msg: "Senha redefinida com sucesso." });
    } catch (error) {
      console.error("Erro ao redefinir a senha:", error.message);
      res.status(500).json({ msg: "Erro ao redefinir a senha." });
    }
  }


  static async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "Nenhuma imagem foi enviada." });
      }

      const result = await Utils.uploadImageToCloudinary(req.file.buffer);

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: "Usuário não encontrado." });
      }

      user.photoUrl = result.secure_url;
      await user.save();

      res.json({ msg: "Foto de perfil atualizada com sucesso.", secure_url: user.photoUrl });
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      res.status(500).json({ msg: "Erro ao fazer upload da imagem. Tente novamente." });
    }
  }


  static validateToken(req, res) {
    res.status(200).json({ message: "Token válido", user: req.user });
  }

  static async deleteAccount(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: "Usuário não encontrado" });
      }

      // Mark account for deletion with 7 days grace period
      user.deletionScheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      user.isActive = false;
      await user.save();

      res.json({
        msg: "Conta marcada para exclusão. Será permanentemente removida em 7 dias.",
        deletionDate: user.deletionScheduledAt
      });
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      res.status(500).json({ msg: "Erro ao processar exclusão da conta." });
    }
  }

  static async cleanupDeletedAccounts() {
    try {
      const accounts = await User.find({
        deletionScheduledAt: { $lt: new Date() },
        isActive: false
      });

      for (const user of accounts) {
        // Delete all related data in parallel
        await Promise.all([
          // Delete user's diary entries
          DiaryEntry.deleteMany({ userId: user._id }),
          // Delete user's posts and their references
          Post.deleteMany({ userId: user._id }),
          // Delete user's notifications
          Notification.deleteMany({ userId: user._id }),
          // Delete profile photo from Cloudinary if exists
          user.photoUrl ? Utils.deleteImageFromCloudinary(user.photoUrl) : Promise.resolve()
        ]);

        // Finally delete the user
        await user.deleteOne();
      }
    } catch (error) {
      console.error("Erro ao limpar contas deletadas:", error);
    }
  }
}


class Utils {
  static async uploadImageToCloudinary(buffer) {
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

  static safeNormalizeEmail(email) {
    return email.toLowerCase().trim();
  }

  static generateRandomCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  static isUserLocked(user) {
    return user.resetPasswordLockUntil && user.resetPasswordLockUntil > Date.now();
  }

  static isCodeExpired(user) {
    return !user.resetPasswordExpires || user.resetPasswordExpires < Date.now();
  }

  static async isCodeValid(user, code) {
    return await bcrypt.compare(code, user.resetPasswordToken);
  }

  static async handleInvalidCode(user) {
    user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
    if (user.resetPasswordAttempts >= MAX_ATTEMPTS) {
      user.resetPasswordLockUntil = Date.now() + LOCK_TIME;
    }
    await user.save();
  }

  static async handleValidCode(user) {
    user.resetPasswordAttempts = 0;
    await user.save();
  }


  static async validateUserForReset(user, code) {
    if (this.isUserLocked(user)) {
      return {
        status: 423,
        msg: "Muitas tentativas falhas. Tente novamente mais tarde.",
      };
    }

    if (this.isCodeExpired(user)) {
      return {
        status: 400,
        msg: "O código de verificação expirou. Solicite um novo código.",
      };
    }

    if (!(await this.isCodeValid(user, code))) {
      await this.handleInvalidCode(user);
      return { status: 400, msg: "Código de verificação inválido." };
    }

    return null;
  }

  static async updateUserPassword(user, newPassword) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
    user.resetPasswordLockUntil = undefined;

    await user.save();
  }

  static deleteImageFromCloudinary(photoUrl) {
    const publicId = photoUrl.split('/').pop().split('.')[0];
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }
}

// Rota de registro
router.post("/register", upload.single("image"), [
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
], AuthController.register);


// Login do usuário
router.post("/login", [body("email").isEmail(), body("password").exists()], AuthController.login);

// Rota de perfil do usuário
router.get("/profile", authMiddleware, AuthController.getProfile);

// Atualizar perfil do usuário
router.put("/profile", authMiddleware, upload.single("image"), AuthController.updateProfile);

// Rota de esqueci minha senha
router.post("/forgotPassword", AuthController.forgotPassword);

// Rota de verificação de código
router.post("/verifyCode", AuthController.verifyCode);

// Rota de redefinição de senha
router.post("/resetPassword", AuthController.resetPassword);

// Rota de upload de imagem
router.post("/upload", authMiddleware, upload.single("image"), AuthController.uploadImage);

// Rota de validação de token
router.get("/validate-token", authMiddleware, AuthController.validateToken);

// Rota de exclusão de conta
router.delete("/delete-account", authMiddleware, AuthController.deleteAccount);

// Configura a tarefa de limpeza para ser executada diariamente
setInterval(AuthController.cleanupDeletedAccounts, 24 * 60 * 60 * 1000);

module.exports = router;
