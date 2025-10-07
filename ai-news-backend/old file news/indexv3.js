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

// Helper to trim description
function getExcerpt(text, wordLimit = 15) {
  if (!text) return "";
  return text.split(" ").slice(0, wordLimit).join(" ") + "...";
}

// Fetch news for one category
async function fetchNewsByCategory(category) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        country: "us",
        category: category,
        pageSize: 9, // limit per category
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
      body { font-family: Arial, sans-serif; margin: 20px; background: #f4f4f4; }
      h1 { text-align: center; margin-bottom: 40px; }
      h2 { margin-top: 40px; color: #333; border-left: 5px solid #007BFF; padding-left: 10px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
      .card { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; }
      .card img { width: 100%; height: 180px; object-fit: cover; }
      .card-body { padding: 15px; flex: 1; display: flex; flex-direction: column; }
      .card h3 { font-size: 18px; margin: 0 0 10px 0; color: #007BFF; }
      .card p { font-size: 14px; color: #555; flex-grow: 1; }
      .card small { display: block; margin-top: 10px; color: #999; font-size: 12px; }
      .card a { text-decoration: none; color: white; background: #007BFF; padding: 8px 12px; border-radius: 5px; text-align: center; margin-top: 10px; }
      .card a:hover { background: #0056b3; }
    </style>
  </head>
  <body>
    <h1>📰 AI Featured News WebApp</h1>
  `;

  for (let category of categories) {
    const articles = await fetchNewsByCategory(category);

    htmlContent += `<h2>${category.toUpperCase()}</h2><div class="grid">`;
    articles.forEach(article => {
      htmlContent += `
        <div class="card">
          <img src="${article.urlToImage || "https://via.placeholder.com/300x180?text=No+Image"}" alt="News Image">
          <div class="card-body">
            <h3>${article.title || "No Title"}</h3>
            <p>${getExcerpt(article.description || article.content, 15)}</p>
            <small>Source: ${article.source?.name || "Unknown"}</small>
            <a href="${article.url}" target="_blank">Read More</a>
          </div>
        </div>
      `;
    });
    htmlContent += `</div>`;
  }

  htmlContent += `
  </body>
  </html>
  `;

  // Write file
  fs.writeFileSync("news.html", htmlContent, "utf8");
  console.log("✅ news.html generated successfully with grid layout!");
}

// Run
buildHtml();
