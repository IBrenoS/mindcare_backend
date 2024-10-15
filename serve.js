require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Configuração do Express para aceitar requisições de um proxy reverso
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Conectar ao MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("Conectado ao MongoDB Atlas"))
  .catch((error) => console.error("Erro ao conectar ao MongoDB:", error));

// Rota para servir o assetlinks.json
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.sendFile(path.join(__dirname, ".well-known", "assetlinks.json"));
});

// Rotas principais
app.use("/auth", require("./routes/authRoutes"));
app.use("/community", require("./routes/communityRoutes"));
app.use("/diary", require("./routes/diaryRoutes"));
app.use("/gamification", require("./routes/gamificationRoutes"));
app.use("/challenges", require("./routes/challengeRoutes"));
app.use("/geo", require("./routes/geoRoutes"));
app.use("/exercises", require("./routes/exerciseRoutes"));
app.use("/educational", require("./routes/educationalRoutes"));
app.use("/automate", require("./routes/automateRoutes"));
app.use("/moderation", require("./routes/moderationRoutes"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Servidor em execução http://localhost:${PORT}`)
);
