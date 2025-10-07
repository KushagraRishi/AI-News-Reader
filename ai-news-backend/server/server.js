require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ TEST ENDPOINTS
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api', (req, res) => {
  const endpoints = [
    'GET  /api/test - Server health check',
    'GET  /api - This endpoints list',
    'POST /api/register - User registration',
    'POST /api/login - User login',
    'GET  /api/news - Get news articles',
    'PUT  /api/user/categories - Update user categories',
    'GET  /api/user/profile - Get user profile',
    'POST /api/news/refresh - Refresh news manually',
    'GET  /api/health - Health check'
  ];
  res.json({ endpoints });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AI News Server is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ainews', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('✅ Connected to MongoDB');
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  categories: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// News Schema
const newsSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  summary: String,
  url: String,
  urlToImage: String,
  source: String,
  category: String,
  publishedAt: Date,
  aiSummary: String,
  createdAt: { type: Date, default: Date.now }
});

const News = mongoose.model('News', newsSchema);

// News API Sources - FIXED GNews URL
const NEWS_SOURCES = {
  NEWS_API: {
    baseUrl: 'https://newsapi.org/v2/top-headlines',
    apiKey: process.env.NEWS_API_KEY
  },
  GNEWS: {
    baseUrl: 'https://gnews.io/api/v4/top-headlines',
    apiKey: process.env.GNEWS_API_KEY || 'eab5040e8bf7cc73ac0656008b88c6f6' // Using your key directly
  }
};

const categories = [
  "business", "entertainment", "general", "health", "science", "sports", "technology"
];

// Fetch from NewsAPI
async function fetchFromNewsAPI(category) {
  try {
    const response = await axios.get(NEWS_SOURCES.NEWS_API.baseUrl, {
      params: {
        country: "us",
        category: category,
        pageSize: 3, // Reduced to avoid limits
        apiKey: NEWS_SOURCES.NEWS_API.apiKey
      },
      timeout: 10000
    });
    
    console.log(`✅ NewsAPI ${category}: ${response.data.articles?.length || 0} articles`);
    
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
    console.error(`❌ NewsAPI Error for ${category}:`, error.message);
    return [];
  }
}

// Fetch from GNews - FIXED URL and parameters
async function fetchFromGNews(category) {
  try {
    // GNews categories mapping
    const gnewsCategories = {
      business: 'business',
      entertainment: 'entertainment', 
      general: 'general',
      health: 'health',
      science: 'science',
      sports: 'sports',
      technology: 'technology'
    };

    const gnewsCategory = gnewsCategories[category] || 'general';
    
    // FIXED: Using the correct parameter name 'category' and URL structure
    const response = await axios.get(NEWS_SOURCES.GNEWS.baseUrl, {
      params: {
        category: gnewsCategory,
        lang: 'en',
        max: 3, // Reduced to avoid rate limits
        apikey: NEWS_SOURCES.GNEWS.apiKey
      },
      timeout: 10000
    });
    
    console.log(`✅ GNews ${category}: ${response.data.articles?.length || 0} articles`);
    
    return response.data.articles.map(article => ({
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      urlToImage: article.image,
      source: article.source?.name || 'GNews',
      category: category,
      publishedAt: new Date(article.publishedAt)
    }));
  } catch (error) {
    console.error(`❌ GNews API Error for ${category}:`, error.response?.data || error.message);
    return [];
  }
}

// AI Summarization using Perplexity - FIXED MODEL
async function generateAISummary(text) {
  try {
    const cleanText = text?.trim()?.substring(0, 1500) || 'No content available';
    
    console.log('🤖 Calling Perplexity AI...');
    
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: "sonar", // CORRECT MODEL NAME
      messages: [
        {
          role: "system",
          content: "You are a helpful news assistant that summarizes articles in 2 concise sentences. Focus on key facts and main points."
        },
        {
          role: "user",
          content: `Summarize this news in 2 sentences: ${cleanText}`
        }
      ],
      max_tokens: 100,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.data.choices && response.data.choices[0].message) {
      console.log('✅ AI Summary generated successfully');
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Unexpected response format from Perplexity API');
    }
  } catch (error) {
    console.error('❌ Perplexity AI Error:', error.response?.data || error.message);
    return generateFallbackSummary(text);
  }
}

// Fallback summary generator
function generateFallbackSummary(text) {
  if (!text || text === 'No content available') {
    return 'AI summary not available for this article.';
  }
  
  const sentences = text.split(/[.!?]+/);
  const firstSentence = sentences[0] || text.substring(0, 120);
  return firstSentence.substring(0, 120) + (firstSentence.length > 120 ? '...' : '');
}

// Remove duplicate articles by URL
function removeDuplicateArticles(articles) {
  const seen = new Set();
  return articles.filter(article => {
    if (!article.url || seen.has(article.url)) {
      return false;
    }
    seen.add(article.url);
    return true;
  });
}

// SINGLE fetchAllNews function - REMOVED DUPLICATE
async function fetchAllNews() {
  console.log('🔄 Starting news fetch...');
  let allArticles = [];
  
  // Fetch with delays to avoid rate limits
  for (let category of categories) {
    try {
      console.log(`📡 Fetching ${category} news...`);
      
      // Fetch from both sources with error handling
      const [newsAPIArticles, gnewsArticles] = await Promise.allSettled([
        fetchFromNewsAPI(category),
        fetchFromGNews(category)
      ]);

      // Add successful fetches
      if (newsAPIArticles.status === 'fulfilled') {
        allArticles = [...allArticles, ...newsAPIArticles.value];
      }
      if (gnewsArticles.status === 'fulfilled') {
        allArticles = [...allArticles, ...gnewsArticles.value];
      }
      
      // Delay between categories to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error in ${category} fetch:`, error.message);
    }
  }

  console.log(`📰 Total articles before deduplication: ${allArticles.length}`);
  
  // Remove duplicates
  const uniqueArticles = removeDuplicateArticles(allArticles);
  console.log(`🔄 After deduplication: ${uniqueArticles.length} articles`);

  // Add AI summaries to first 5 articles only (to avoid Perplexity limits)
  const articlesToProcess = uniqueArticles.slice(0, 5);
  console.log(`🤖 Adding AI summaries to ${articlesToProcess.length} articles...`);
  
  for (let i = 0; i < articlesToProcess.length; i++) {
    const article = articlesToProcess[i];
    try {
      const textToSummarize = article.content || article.description || article.title;
      console.log(`📝 Processing ${i+1}/${articlesToProcess.length}: ${article.title?.substring(0, 50)}...`);
      
      article.aiSummary = await generateAISummary(textToSummarize);
      
      // Save to database
      await News.findOneAndUpdate(
        { url: article.url },
        { ...article },
        { upsert: true, new: true }
      );
      
      // Delay between AI calls
      if (i < articlesToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error('Error processing article:', error.message);
      article.aiSummary = generateFallbackSummary(article.description || article.title);
    }
  }

  // Add placeholder for remaining articles
  const remainingArticles = uniqueArticles.slice(5).map(article => ({
    ...article,
    aiSummary: 'AI summary will be available after processing.'
  }));

  const finalArticles = [...articlesToProcess, ...remainingArticles];
  console.log(`🎉 News fetch completed: ${finalArticles.length} total articles`);
  
  return finalArticles;
}

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, categories } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

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
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, email: user.email, categories: user.categories }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get news for user's categories - IMPROVED ERROR HANDLING
app.get('/api/news', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let userCategories = ['general']; // Default to general only
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user && user.categories.length > 0) {
          userCategories = user.categories;
        }
      } catch (error) {
        console.log('Token invalid, using default categories');
      }
    }

    console.log(`📊 Fetching news for categories: ${userCategories.join(', ')}`);
    
    // Try to get news from database first
    let news = await News.find({ 
      category: { $in: userCategories }
    })
    .sort({ publishedAt: -1 })
    .limit(20);

    console.log(`📚 Found ${news.length} articles in database`);

    // If no news in DB or very few, fetch fresh news
    if (news.length < 5) {
      console.log('🔄 Few articles in DB, fetching fresh news...');
      try {
        const freshNews = await fetchAllNews();
        const filteredNews = freshNews.filter(article => 
          userCategories.includes(article.category)
        ).slice(0, 20);
        
        if (filteredNews.length > 0) {
          news = filteredNews;
          console.log(`✅ Using ${filteredNews.length} fresh articles`);
        }
      } catch (fetchError) {
        console.error('Error fetching fresh news:', fetchError);
        // Continue with DB articles even if fresh fetch fails
      }
    }

    // If still no news, return mock data
    if (news.length === 0) {
      console.log('📝 No news found, returning mock data');
      news = [
        {
          title: 'Welcome to AI News Reader!',
          description: 'This is a sample news article. The system is fetching real news articles for you.',
          url: 'https://example.com',
          source: 'AI News System',
          category: 'general',
          publishedAt: new Date(),
          aiSummary: 'This is a placeholder article while the system loads real news content.',
          urlToImage: null
        }
      ];
    }

    res.json(news);
  } catch (error) {
    console.error('❌ Error in /api/news:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user categories
app.put('/api/user/categories', authMiddleware, async (req, res) => {
  try {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories array is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { categories },
      { new: true }
    );

    res.json({ 
      message: 'Categories updated successfully', 
      categories: user.categories 
    });
  } catch (error) {
    console.error('Error updating categories:', error);
    res.status(500).json({ error: 'Failed to update categories' });
  }
});

// Get user profile
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Manual news refresh endpoint
app.post('/api/news/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual news refresh requested');
    const freshNews = await fetchAllNews();
    res.json({ 
      message: 'News refreshed successfully', 
      count: freshNews.length,
      articles: freshNews.slice(0, 5) // Return first 5 articles
    });
  } catch (error) {
    console.error('Error refreshing news:', error);
    res.status(500).json({ error: 'Failed to refresh news' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI}`);
  console.log(`🤖 AI: Perplexity`);
  console.log(`📍 Test URL: http://localhost:${PORT}/api/test`);
  
  // Initial news fetch with error handling
  setTimeout(async () => {
    try {
      console.log('🔄 Starting initial news fetch...');
      await fetchAllNews();
      console.log('✅ Initial news fetch completed');
    } catch (error) {
      console.error('❌ Initial news fetch failed:', error.message);
    }
  }, 2000);
  
  // Fetch news every 60 minutes instead of 30 to avoid rate limits
  setInterval(async () => {
    try {
      console.log('🔄 Scheduled news fetch...');
      await fetchAllNews();
    } catch (error) {
      console.error('Scheduled news fetch failed:', error);
    }
  }, 60 * 60 * 1000);
});