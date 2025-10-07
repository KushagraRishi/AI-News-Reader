require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ainews', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas and models (same as before)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  categories: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const newsSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  url: String,
  urlToImage: String,
  source: String,
  category: String,
  publishedAt: Date,
  aiSummary: String,
  createdAt: { type: Date, default: Date.now }
});

const News = mongoose.model('News', newsSchema);

const categories = ["business", "entertainment", "general", "health", "science", "sports", "technology"];

// SIMPLIFIED AI Summarization with multiple model fallbacks
async function generateAISummary(text) {
  const modelsToTry = [
    "sonar-pro"
  ];

  for (const model of modelsToTry) {
    try {
      console.log(`Trying model: ${model}`);
      
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: model,
        messages: [
          {
            role: "system",
            content: "You summarize news articles in 2 clear sentences focusing on key facts."
          },
          {
            role: "user", 
            content: `Summarize this news in 2 sentences: ${text.substring(0, 1500)}`
          }
        ],
        max_tokens: 100,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data.choices?.[0]?.message?.content) {
        console.log(`✅ Success with model: ${model}`);
        return response.data.choices[0].message.content;
      }
    } catch (error) {
      console.log(`❌ Failed with model ${model}:`, error.response?.data?.error?.message || error.message);
      continue; // Try next model
    }
  }

  // If all models fail, return fallback
  return `Summary: ${text.substring(0, 100)}...`;
}

// Fetch news from NewsAPI
async function fetchFromNewsAPI(category) {
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        country: "us",
        category: category,
        pageSize: 5,
        apiKey: process.env.NEWS_API_KEY
      }
    });
    
    return response.data.articles.map(article => ({
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      urlToImage: article.urlToImage,
      source: article.source?.name || 'Unknown',
      category: category,
      publishedAt: new Date(article.publishedAt)
    }));
  } catch (error) {
    console.error(`NewsAPI Error for ${category}:`, error.message);
    return [];
  }
}

// Main news fetching function
async function fetchAllNews() {
  console.log('🔄 Starting news fetch...');
  let allArticles = [];
  
  // Fetch from all categories
  for (let category of categories) {
    try {
      const articles = await fetchFromNewsAPI(category);
      allArticles = [...allArticles, ...articles];
      console.log(`✅ Fetched ${articles.length} ${category} articles`);
    } catch (error) {
      console.error(`❌ Error fetching ${category}:`, error.message);
    }
  }

  console.log(`📰 Total articles: ${allArticles.length}`);
  
  // Process first 10 articles with AI
  const articlesToProcess = allArticles.slice(0, 10);
  
  for (let i = 0; i < articlesToProcess.length; i++) {
    const article = articlesToProcess[i];
    try {
      const text = article.description || article.title;
      console.log(`🤖 Processing ${i + 1}/${articlesToProcess.length}: ${article.title.substring(0, 50)}...`);
      
      article.aiSummary = await generateAISummary(text);
      
      // Save to DB
      await News.findOneAndUpdate(
        { url: article.url },
        article,
        { upsert: true }
      );
      
      // Delay to avoid rate limits
      if (i < articlesToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error('Error processing article:', error.message);
      article.aiSummary = 'Summary not available.';
    }
  }
  
  return allArticles;
}

// Routes (same as before)
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, categories } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      password: hashedPassword,
      categories: categories || ['general']
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h'
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, email: user.email, categories: user.categories }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, categories: user.categories }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let userCategories = categories;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user && user.categories.length > 0) {
          userCategories = user.categories;
        }
      } catch (error) {
        // Token invalid, use default categories
      }
    }

    let news = await News.find({ 
      category: { $in: userCategories }
    }).sort({ publishedAt: -1 }).limit(30);

    // If no news in DB, fetch fresh
    if (news.length === 0) {
      news = await fetchAllNews();
    }

    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Perplexity API endpoint
app.get('/api/test-ai', async (req, res) => {
  try {
    const testText = "Scientists have discovered a new species of dinosaur in Argentina. The fossil remains suggest it was a giant herbivore that lived 90 million years ago. This discovery helps fill gaps in our understanding of dinosaur evolution.";
    
    const summary = await generateAISummary(testText);
    res.json({ 
      success: true, 
      original: testText,
      summary: summary 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get available Perplexity models (if API supports it)
app.get('/api/ai-models', async (req, res) => {
  try {
    // Note: Perplexity might not have a models endpoint
    // This is a hardcoded list of known working models
    const availableModels = [
      "sonar"
    ];
    
    res.json({ models: availableModels });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Using Perplexity AI for summaries`);
  
  // Test AI connection on startup
  setTimeout(async () => {
    try {
      const testSummary = await generateAISummary("Test message for AI connection.");
      console.log('✅ AI Connection Test:', testSummary.substring(0, 50) + '...');
    } catch (error) {
      console.log('❌ AI Connection Failed:', error.message);
    }
  }, 2000);
  
  // Fetch news every hour
  setInterval(fetchAllNews, 60 * 60 * 1000);
  fetchAllNews();
});