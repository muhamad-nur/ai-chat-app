# ⚡ NexusAI — Free-Tier Production AI Q&A Web Application

A complete, ultra-fast, production-grade AI Q&A web application architected for **100% zero-cost operation**. Built with **FastAPI**, **SQLite**, and the official **Google Gemini Free-Tier API** (`google-genai` SDK), styled with a sleek dark-mode SaaS interface comparable to ChatGPT and Gemini.

---

## 🌟 Key Features

- **100% Zero-Cost Architecture:** Runs entirely on free resources — SQLite embedded database and Google AI Studio's free tier.
- **Real-Time Token Streaming:** Blazing fast responses using HTTP chunked streaming (`ReadableStream` & `TextDecoder`) with a dynamic typing cursor.
- **Full Conversational Memory:** Multi-turn session persistence stored in SQLite with automatic session grouping (Today, Yesterday, Previous 7 Days, Older).
- **Auto-Session Naming:** Sessions are intelligently named based on the user's first prompt.
- **Production Dark Mode UI:** Tailored with Tailwind CSS (`zinc` palette), glassmorphism, responsive mobile drawer, and quick-prompt starter cards.
- **Rich Markdown & Code Highlighting:** Formatted with `marked.js` and `highlight.js`, featuring syntax highlighting and one-click "Copy Code" with instant feedback.
- **1-Click Free Cloud Deployment:** Ready for deployment on **Render.com** (via `render.yaml`) or **Koyeb** with the included multi-stage `Dockerfile`.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Cost | Description |
|---|---|---|---|
| **Backend** | Python 3.10+, FastAPI, Uvicorn | $0 | High-performance asynchronous REST & streaming API |
| **Database** | SQLite via SQLAlchemy 2.0 | $0 | Zero-setup persistent storage (`./chat.db`) |
| **AI Engine** | Google Gemini API (`google-genai` SDK) | $0 | Powered by `gemini-3.8-flash` free tier |
| **Frontend** | HTML5, Vanilla ES6+, Tailwind CSS CDN | $0 | Fast, dependency-free responsive SPA |
| **Markdown / Code**| Marked.js + Highlight.js (GitHub Dark) | $0 | Client-side dynamic rendering and copy-to-clipboard |
| **Deployment** | Docker / Render Blueprint | $0 | Ready for 1-click cloud free tiers |

---

## 📁 Directory Structure

```text
ai-chat-app/
├── app/
│   ├── __init__.py
│   ├── config.py              # Environment configuration & Pydantic settings
│   ├── database.py            # SQLite engine, SessionLocal, Base declarative
│   ├── models.py              # SQLAlchemy SessionModel & MessageModel
│   ├── schemas.py             # Pydantic validation schemas
│   ├── services/
│   │   ├── __init__.py
│   │   └── ai_service.py      # Google Gemini client & async stream generator
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── chat.py            # POST /api/chat/stream endpoint
│   │   └── sessions.py        # Sessions CRUD & message history endpoints
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css      # Dark scrollbar, glassmorphism, typing cursor
│   │   └── js/
│   │       └── app.js         # Reactive SPA logic, stream reader & copy code
│   └── templates/
│       └── index.html         # Responsive Tailwind dark mode interface
├── .env.example               # Template environment variables
├── .env                       # Local active environment configuration
├── Dockerfile                 # Multi-stage lightweight container
├── render.yaml                # Free Render.com Blueprint specification
├── requirements.txt           # Python dependencies
├── README.md                  # Complete documentation
└── run.py                     # Entry point & server bootstrapper
```

---

## 🔑 How to Get a Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with any standard Google account (no credit card required).
3. Click **"Create API Key"** and copy your generated key.
4. Paste it into your `.env` file:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

---

## 🚀 Local Quickstart Guide

### 1. Open Terminal and Navigate to the Project

```bash
cd ai-chat-app
```

### 2. Create and Activate a Virtual Environment

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Verify Environment Configuration

Ensure your `.env` file exists with your Gemini API key:
```env
GEMINI_API_KEY=AQ.Ab8RN6ImyF-0iq9TJk6l8e-5UHbYhYoGRDqQIGkfixM8ykKOrg
HOST=0.0.0.0
PORT=8000
MODEL_NAME=gemini-3.8-flash
```

### 5. Launch the Application

```bash
python run.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## ☁️ Free Cloud Deployment

### Option A: Render.com (1-Click Blueprint)

1. Push this repository to GitHub or GitLab.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml`.
4. In the Environment Variables prompt, fill in your `GEMINI_API_KEY`.
5. Click **Apply**. Your app will be live on a free `onrender.com` URL!

### Option B: Koyeb / Railway (Using Dockerfile)

1. Connect your repository to [Koyeb](https://www.koyeb.com/) or Railway.
2. Select **Dockerfile** as the build method.
3. Add the `GEMINI_API_KEY` secret under Environment Variables.
4. Set Port to `8000` and deploy.

---

## 📡 API Reference

### 1. Real-Time Chat Stream
- **Endpoint:** `POST /api/chat/stream`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "session_id": "optional-uuid-here",
    "message": "Explain how photosynthesis works."
  }
  ```
- **Response:** Streaming text response (`text/plain; charset=utf-8`) with response headers:
  - `X-Session-Id`: Active session UUID
  - `X-Session-Title`: Conversation title

### 2. List All Sessions
- **Endpoint:** `GET /api/sessions`
- **Response:** List of chat sessions ordered by newest first:
  ```json
  [
    {
      "id": "c1f7601e-4503-4f90-a359-994df51ce60d",
      "title": "Explain how photosynthesis...",
      "created_at": "2026-10-07T10:00:00Z",
      "message_count": 2,
      "last_message": "Photosynthesis is the process..."
    }
  ]
  ```

### 3. Fetch Session Messages
- **Endpoint:** `GET /api/sessions/{session_id}/messages`
- **Response:** Chronological history of messages for that session.

### 4. Delete Session
- **Endpoint:** `DELETE /api/sessions/{session_id}`
- **Response:** `204 No Content`

### 5. Health Check
- **Endpoint:** `GET /api/health`
- **Response:**
  ```json
  {
    "status": "healthy",
    "model": "gemini-3.8-flash",
    "database": "sqlite",
    "free_tier": true
  }
  ```

