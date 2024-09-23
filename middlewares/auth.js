const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Ajuste o caminho conforme necessário

async function authMiddleware(req, res, next) {
  // Captura o cabeçalho Authorization
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "Acesso negado. Sem token." });
  }

  // Extrai o token do cabeçalho
  const token = authHeader.split(" ")[1];

  try {
    // Verifica o token JWT usando a chave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário no banco de dados com base no ID do token
    const user = await User.findById(decoded.userId).select("-password");

    // Verifica se o usuário foi encontrado
    if (!user) {
      return res.status(404).json({ msg: "Usuário não encontrado." });
    }

    // Salva as informações do usuário no req, incluindo `userId` e `role`
    req.user = { id: decoded.userId, role: decoded.role };

    // Continua para a próxima função na rota
    next();
  } catch (err) {
    // Tratamento de erros específicos
    if (err.name === "TokenExpiredError") {
      // Retorna mensagem específica para token expirado
      return res.status(401).json({ msg: "Token expirado." });
    } else if (err.name === "JsonWebTokenError") {
      // Retorna mensagem para token inválido
      return res.status(400).json({ msg: "Token inválido." });
    }

    console.error(err); // Log do erro para depuração
    res.status(500).json({ msg: "Erro no servidor ao validar o token." });
  }
}

module.exports = authMiddleware;
