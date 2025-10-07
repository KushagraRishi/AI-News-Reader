# 🤖 AI News Reader - Intelligent News Summarization Platform

![AI News Reader](https://img.shields.io/badge/AI-Powered-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-green)

## 🎯 Mission & Vision

**Our Mission**: To revolutionize how people consume news by leveraging artificial intelligence to provide personalized, concise, and relevant news summaries.

## ✨ What Problem We Solve

In today's digital age, people face:
- 📰 **Information Overload**: Too many news sources, too little time
- ⏰ **Time Constraints**: Reading full articles is time-consuming
- 🎯 **Relevance Issues**: Generic news feeds don't match personal interests
- 🔄 **Repetitive Content**: Same news across multiple platforms

**Our Solution**: AI-powered news aggregation that delivers personalized, summarized news in seconds!

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **React Router** - Navigation and routing
- **Context API** - State management
- **Modern CSS** - Responsive design
- **Axios** - API communication

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### External APIs
- **NewsAPI** - Primary news source
- **GNews API** - Secondary news source
- **Perplexity AI** - News summarization
- **MongoDB Atlas** - Cloud database

## 🎨 Key Features

### ✅ Currently Working & Implemented

1. **🤖 AI-Powered Summaries**
   - ✅ Real-time news summarization using Perplexity AI
   - ✅ 2-3 sentence concise summaries
   - ✅ Fallback summaries when AI is unavailable

2. **👤 User Authentication**
   - ✅ Secure user registration and login
   - ✅ JWT token-based authentication
   - ✅ Password hashing with bcrypt

3. **🎯 Personalized News Feed**
   - ✅ Category-based news filtering
   - ✅ User preference management
   - ✅ Multi-category selection

4. **📱 Modern UI/UX**
   - ✅ Responsive design for all devices
   - ✅ Clean, professional interface
   - ✅ Real-time loading states

5. **🔧 Technical Features**
   - ✅ MongoDB database integration
   - ✅ Error handling and validation
   - ✅ CORS configuration
   - ✅ Rate limiting protection

### 🚧 Current Status & What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| User Registration | ✅ **Working** | Full functionality |
| User Login | ✅ **Working** | JWT authentication |
| News Fetching | ✅ **Working** | From NewsAPI & GNews |
| AI Summaries | ✅ **Working** | Perplexity AI integration |
| Category Filtering | ✅ **Working** | User preferences |
| Responsive UI | ✅ **Working** | Mobile & desktop |
| Database Storage | ✅ **Working** | MongoDB Atlas |
| Real-time Updates | ✅ **Working** | Automatic refresh |

### 📊 Supported News Categories
- ✅ Business
- ✅ Entertainment
- ✅ General
- ✅ Health
- ✅ Science
- ✅ Sports
- ✅ Technology

## 🏗️ Project Architecture
Frontend (React) → Backend (Node.js/Express) → External APIs → Database (MongoDB)
↓ ↓ ↓ ↓
User Interface Business Logic News Data & AI User Data & News
