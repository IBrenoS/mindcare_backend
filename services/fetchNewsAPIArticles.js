const axios = require("axios");
const Article = require("../models/articles");

async function fetchNewsAPIArticles(limit = 10) {
  const apiKey = process.env.NEWS_API_KEY;

  try {
    const articles = await fetchArticlesFromAPI(apiKey, limit);
    await saveArticles(articles, limit);
    console.log(
      `${articles.length} artigos de saúde mental salvos com sucesso!`
    );
  } catch (err) {
    console.error("Erro ao buscar ou salvar artigos da NewsAPI:", err.message);
  }
}

async function fetchArticlesFromAPI(apiKey, limit) {
  const response = await axios.get("https://newsapi.org/v2/everything", {
    params: {
      q: "saúde mental OR saúde emocional OR ansiedade OR depressão", // Palavras-chave mais específicas
      language: "pt",
      sortBy: "relevancy",
      apiKey: apiKey,
      pageSize: limit, // Define o limite de artigos por requisição
    },
  });
  return response.data.articles;
}

async function saveArticles(articles, batchSize) {
  let batch = [];
  for (const article of articles) {
    if (!isValidArticle(article)) {
      console.warn("Artigo inválido, faltando título ou URL:", article);
      continue; // Pula o artigo que não tem título ou URL
    }

    const newArticle = createArticle(article);
    batch.push(newArticle);

    if (batch.length === batchSize) {
      await saveBatch(batch);
      batch = []; // Limpa o batch após salvar
    }
  }

  // Salva qualquer artigo restante
  if (batch.length > 0) {
    await saveBatch(batch);
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

async function saveBatch(batch) {
  try {
    await Article.insertMany(batch); // Usa inserção em lote para otimizar o desempenho
    console.log(`Lote de ${batch.length} artigos salvo com sucesso!`);
  } catch (err) {
    console.error(
      "Erro ao salvar o lote de artigos no banco de dados:",
      err.message
    );
  }
}

module.exports = fetchNewsAPIArticles;
