const multer = require("multer");

// Configuração do multer para armazenar arquivos temporariamente na memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

module.exports = upload;
