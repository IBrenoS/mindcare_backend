const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  // Captura o cabeçalho Authorization
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "Acesso negado. Sem token." });
  }

  // Extrai o token do cabeçalho
  const token = authHeader.split(" ")[1];

  try {
    // Verifica o token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Salva as informações do usuário no req, incluindo `userId` e `role`
    req.user = { id: decoded.userId, role: decoded.role };

    next(); // Permite o acesso à rota
  } catch (err) {
    console.error(err); // Log do erro para depuração
    res.status(400).json({ msg: "Token inválido." });
  }
}

module.exports = authMiddleware;
