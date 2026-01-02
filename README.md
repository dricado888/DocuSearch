# 📚 DocuSearch Pro

AI-Powered Document Intelligence System with RAG (Retrieval-Augmented Generation)

![DocuSearch](https://img.shields.io/badge/React-18.3-blue?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.10+-yellow?logo=python)
![LangChain](https://img.shields.io/badge/LangChain-0.3-purple)

## 🌟 Features

- **Upload & Index PDFs** - Process multiple PDF documents with automatic chunking
- **AI-Powered Q&A** - Ask questions about your documents using Groq's Llama 3.3 70B
- **Semantic Search** - Find relevant information using HuggingFace embeddings
- **File Management** - Remove individual files from the index
- **Beautiful UI** - Dark theme with purple accents built with Shadcn/ui
- **Real-time Responses** - Fast vector similarity search with ChromaDB

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │  (Vite + Tailwind + Shadcn)
│   Port 3000     │
└────────┬────────┘
         │ HTTP/JSON
         ▼
┌─────────────────┐
│  FastAPI Backend│  (Python REST API)
│   Port 8000     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   RAG Engine    │  (LangChain + ChromaDB)
│   - PDF Loader  │
│   - Embeddings  │
│   - Vector DB   │
│   - LLM (Groq)  │
└─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Groq API Key ([Get it free](https://console.groq.com))

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn api:app --reload
```

Server runs at: `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

App runs at: `http://localhost:3000` or `http://localhost:5173`

## 📁 Project Structure

```
docusearch-pro/
├── backend/
│   ├── api.py              # FastAPI endpoints
│   ├── rag_engine.py       # Core RAG logic
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── index.css       # Tailwind styles
│   │   └── components/ui/  # Shadcn components
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🔧 Environment Variables

Create a `.env` file in the backend directory:

```env
GROQ_API_KEY=your_api_key_here
```

**Note:** Never commit `.env` files! They're in `.gitignore` for security.

## 📚 How It Works

1. **Upload PDFs** - Documents are processed and split into 1000-character chunks
2. **Create Embeddings** - Each chunk is converted to a 384-dimensional vector using `all-MiniLM-L6-v2`
3. **Store in ChromaDB** - Vectors are indexed for fast similarity search
4. **Ask Questions** - User query is embedded and matched against document chunks
5. **Generate Answer** - Top K relevant chunks are sent to Groq's LLM with the question
6. **Return Sources** - Answer includes citations from source documents

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Component library
- **Lucide React** - Icons
- **Axios** - HTTP client

### Backend
- **FastAPI** - Web framework
- **LangChain** - RAG orchestration
- **ChromaDB** - Vector database
- **HuggingFace** - Embeddings (all-MiniLM-L6-v2)
- **Groq** - LLM inference (Llama 3.3 70B)
- **PyPDF** - PDF processing

## 🎨 Screenshots

*Coming soon!*

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes!

## 👤 Author

**Swastik Sahoo**
Computer Science Student @ Arizona State University

---

⭐ If you find this helpful, please star the repo!
