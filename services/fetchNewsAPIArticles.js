const axios = require("axios");
const Article = require("../models/articles");

async function fetchNewsAPIArticles() {
  const apiKey = process.env.NEWS_API_KEY;

  try {
    const articles = await fetchArticlesFromAPI(apiKey);
    await saveArticles(articles);
    console.log("Todos os artigos de saúde mental salvos com sucesso!");
  } catch (err) {
    console.error("Erro ao buscar ou salvar artigos da NewsAPI:", err.message);
  }
}

async function fetchArticlesFromAPI(apiKey) {
  const response = await axios.get("https://newsapi.org/v2/everything", {
    params: {
      q: "saúde mental OR saúde emocional OR ansiedade OR depressão", // Palavras-chave mais específicas
      language: "pt",
      sortBy: "relevancy",
      apiKey: apiKey,
      pageSize: 10,
    },
  });
  return response.data.articles;
}

async function saveArticles(articles) {
  for (const article of articles) {
    if (!isValidArticle(article)) {
      console.warn("Artigo inválido, faltando título ou URL:", article);
      continue; // Pula o artigo que não tem título ou URL
    }

    const newArticle = createArticle(article);

    await saveArticle(newArticle, article.title);
  }
}

function isValidArticle(article) {
  return article.title && article.url;
}

function createArticle(article) {
  return new Article({
    title: article.title,
    description: article.description || "Descrição indisponível",
    content: article.content || "Conteúdo indisponível",
    author: article.author || "Autor desconhecido",
    url: article.url,
    source: article.source.name || "Fonte desconhecida",
    status: "pending",
  });
}

async function saveArticle(newArticle, title) {
  try {
    await newArticle.save();
    console.log(`Artigo "${title}" salvo com sucesso!`);
  } catch (err) {
    console.error("Erro ao salvar o artigo no banco de dados:", err.message);
  }
}

module.exports = fetchNewsAPIArticles;
