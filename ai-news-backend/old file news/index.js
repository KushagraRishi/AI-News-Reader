require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = "https://newsapi.org/v2/top-headlines";

async function fetchNews() {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        country: "us",   // You can change country (eg. "in" for India)
        category: "technology", // eg. business, sports, health
        apiKey: API_KEY
      }
    });

    const articles = response.data.articles;

    console.log("=== Latest News ===\n");
    articles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Source: ${article.source.name}`);
      console.log(`   URL: ${article.url}\n`);
    });

  } catch (error) {
    console.error("Error fetching news:", error.message);
  }
}

fetchNews();
