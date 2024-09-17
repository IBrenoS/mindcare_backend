const authorize = (roles = []) => {
  return (req, res, next) => {
    console.log("User Role:", req.user.role);
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ msg: "Acesso negado. Função insuficiente." });
    }
    next();
  };
};

module.exports = authorize;
