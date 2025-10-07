require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = "https://newsapi.org/v2/top-headlines";

// Define the categories you want
const categories = ["business", "technology", "sports", "health", "science"];

async function fetchNewsByCategory(category) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        country: "us",   // Change to "in" if you want India news
        category: category,
        apiKey: API_KEY
      }
    });

    const articles = response.data.articles;

    console.log(`\n=== ${category.toUpperCase()} NEWS ===\n`);
    articles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Source: ${article.source.name}`);
      console.log(`   URL: ${article.url}\n`);
    });

  } catch (error) {
    console.error(`Error fetching ${category} news:`, error.message);
  }
}

async function fetchAllCategories() {
  for (let category of categories) {
    await fetchNewsByCategory(category);
  }
}

fetchAllCategories();
