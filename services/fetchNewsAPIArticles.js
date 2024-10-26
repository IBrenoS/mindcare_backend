const axios = require("axios");
const Article = require("../models/articles");

async function fetchNewsAPIArticles() {
  const apiKey = process.env.NEWS_API_KEY;

  try {
    const articles = await fetchArticlesFromAPI(apiKey);
    await saveArticles(articles);
    console.log("Todos os artigos salvos com sucesso!");
  } catch (err) {
    console.error("Erro ao buscar ou salvar artigos da NewsAPI:", err.message);
  }
}

async function fetchArticlesFromAPI(apiKey) {
  const response = await axios.get("https://newsapi.org/v2/everything", {
    params: {
      q: "saúde mental OR saúde emocional OR ansiedade OR depressão",
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
    const newArticle = new Article({
      title: article.title,
      description: article.description || "Descrição indisponível",
      content: article.content || "Conteúdo indisponível",
      author: article.author || "Autor desconhecido",
      url: article.url,
      urlToImage: article.urlToImage || "", // Salva a URL da imagem
      source: article.source.name || "Fonte desconhecida",
      status: "pending",
    });
    await newArticle.save();
  }
}

module.exports = fetchNewsAPIArticles;
