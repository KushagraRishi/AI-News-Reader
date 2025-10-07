require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = "https://newsapi.org/v2/top-headlines";

const categories = [
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology"
];

// Fetch news for one category
async function fetchNewsByCategory(category) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        country: "us",   // change "in" for India
        category: category,
        apiKey: API_KEY
      }
    });

    return response.data.articles;
  } catch (error) {
    console.error(`Error fetching ${category} news:`, error.message);
    return [];
  }
}

// Build HTML page
async function buildHtml() {
  let htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>AI News Reader</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h2 { background: #333; color: white; padding: 10px; border-radius: 5px; }
      ul { list-style-type: none; padding: 0; }
      li { margin-bottom: 10px; }
      a { text-decoration: none; color: #0066cc; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>AI Featured News WebApp</h1>
  `;

  for (let category of categories) {
    const articles = await fetchNewsByCategory(category);

    htmlContent += `<h2>${category.toUpperCase()}</h2><ul>`;
    articles.forEach(article => {
      htmlContent += `
        <li>
          <strong>${article.title}</strong><br>
          <em>${article.source.name}</em><br>
          <a href="${article.url}" target="_blank">Read more</a>
        </li>
      `;
    });
    htmlContent += `</ul>`;
  }

  htmlContent += `
  </body>
  </html>
  `;

  // Write file
  fs.writeFileSync("news.html", htmlContent, "utf8");
  console.log("✅ news.html generated successfully!");
}

// Run
buildHtml();
