import { useState, useRef } from 'react'
import axios from 'axios'
import { 
  Search, Upload, FileText, Send, Loader2, CheckCircle, 
  AlertCircle, Sparkles, BookOpen, Zap, Settings, X,
  ChevronDown, ChevronUp, File, Trash2
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const API_URL = 'http://localhost:8000'

function App() {
  // State management
  const [apiKey, setApiKey] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [files, setFiles] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [totalChunks, setTotalChunks] = useState(0)
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [searchDepth, setSearchDepth] = useState(4)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  
  const fileInputRef = useRef(null)

  // Initialize the RAG system
  const handleInitialize = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key')
      return
    }
    
    setIsLoading(true)
    setLoadingMessage('Initializing AI system...')
    setError('')
    
    try {
      await axios.post(`${API_URL}/init`, { api_key: apiKey })
      setIsInitialized(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initialize')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles(prev => [...prev, ...selectedFiles])
  }

  // Remove a file from selection
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Upload and process files
  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select files to upload')
      return
    }
    
    setIsLoading(true)
    setLoadingMessage('Processing documents...')
    setError('')
    
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setUploadedFiles(response.data.processed_files)
      setTotalChunks(response.data.total_chunks)
      setFiles([])
      
      if (response.data.errors?.length > 0) {
        setError(`Some files failed: ${response.data.errors.join(', ')}`)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  // Submit a question
  const handleQuery = async (e) => {
    e.preventDefault()
    
    if (!question.trim()) return
    
    setIsLoading(true)
    setLoadingMessage('Searching documents...')
    setError('')
    
    try {
      const response = await axios.post(`${API_URL}/query`, {
        question: question,
        num_sources: searchDepth
      })
      
      setChatHistory(prev => [{
        question: question,
        answer: response.data.answer,
        sources: response.data.sources,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev])
      
      setQuestion('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Query failed')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  // Remove an uploaded file
  const removeUploadedFile = async (filename) => {
    try {
      // Call backend to remove file from index
      await axios.post(`${API_URL}/remove-file`, { filename })

      // Update state
      setUploadedFiles(prev => prev.filter(f => f !== filename))

      // If no files left, clear chat history
      if (uploadedFiles.length === 1) {
        setChatHistory([])
        setTotalChunks(0)
      }
    } catch (err) {
      setError('Failed to remove file')
    }
  }

  // Reset the system
  const handleReset = async () => {
    try {
      await axios.post(`${API_URL}/reset`)
      setIsInitialized(false)
      setUploadedFiles([])
      setTotalChunks(0)
      setChatHistory([])
      setApiKey('')
    } catch (err) {
      setError('Reset failed')
    }
  }

  const depthLabels = {
    2: 'Quick', 3: 'Quick', 4: 'Balanced', 
    5: 'Balanced', 6: 'Deep', 7: 'Deep', 8: 'Thorough'
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-purple/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-blue/20 rounded-full blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-blue">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-extrabold gradient-text">DocuSearch</h1>
          </div>
          <p className="text-gray-400 text-lg">
            AI-Powered Document Intelligence • Upload • Ask • Discover
          </p>
        </header>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4 text-red-400 hover:text-red-300" />
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-accent-purple animate-spin mx-auto mb-4" />
              <p className="text-gray-300 text-lg">{loadingMessage}</p>
            </div>
          </div>
        )}

        {/* Step 1: API Key */}
        {!isInitialized ? (
          <div className="max-w-md mx-auto">
            <div className="glass rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-accent-purple/20">
                  <Settings className="w-5 h-5 text-accent-purple" />
                </div>
                <h2 className="text-xl font-semibold">Get Started</h2>
              </div>
              
              <p className="text-gray-400 mb-6">
                Enter your groq API key to initialize the AI system.
              </p>
              
              <Input
  type="password"
  value={apiKey}
  onChange={(e) => setApiKey(e.target.value)}
  placeholder="gsk_..."
  className="mb-4"
/>
              
              <button
                onClick={handleInitialize}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue
                         font-semibold hover:opacity-90 transition-opacity flex items-center 
                         justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Initialize
              </button>
              
              <p className="text-gray-500 text-sm mt-4 text-center">
                Get your API key from{' '}
                <a href="https://console.anthropic.com" target="_blank" 
                   className="text-accent-purple hover:underline">
                  console.anthropic.com
                </a>
              </p>
            </div>
          </div>
        ) : (
          /* Main interface */
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left panel - Upload */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Upload card */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent-blue/20">
                      <Upload className="w-5 h-5 text-accent-blue" />
                    </div>
                    <h2 className="text-lg font-semibold">Documents</h2>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Reset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-xl p-8 
                           text-center cursor-pointer hover:border-accent-purple/50 
                           transition-colors group"
                >
                  <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3 
                                      group-hover:text-accent-purple transition-colors" />
                  <p className="text-gray-400 text-sm">
                    Click to select PDFs
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                
                {/* Selected files */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 
                                            rounded-lg bg-dark-700">
                        <div className="flex items-center gap-2 truncate">
                          <File className="w-4 h-4 text-accent-purple flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <button onClick={() => removeFile(i)}>
                          <X className="w-4 h-4 text-gray-500 hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                    
                    <button
                      onClick={handleUpload}
                      className="w-full py-2.5 rounded-xl bg-accent-blue/20 text-accent-blue
                               font-medium hover:bg-accent-blue/30 transition-colors 
                               flex items-center justify-center gap-2 mt-3"
                    >
                      <Upload className="w-4 h-4" />
                      Process {files.length} file{files.length > 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Indexed</h2>
                  </div>

                  <div className="space-y-2">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg
                                            bg-dark-700/50 text-sm group">
                        <div className="flex items-center gap-2 truncate flex-1">
                          <BookOpen className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="truncate">{file}</span>
                        </div>
                        <button
                          onClick={() => removeUploadedFile(file)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity
                                   hover:text-red-400 text-gray-500"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Total chunks</span>
                      <span className="text-accent-purple font-semibold">{totalChunks}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Search depth */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent-pink/20">
                    <Sparkles className="w-5 h-5 text-accent-pink" />
                  </div>
                  <h2 className="text-lg font-semibold">Search Depth</h2>
                </div>
                
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={searchDepth}
                  onChange={(e) => setSearchDepth(parseInt(e.target.value))}
                  className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:bg-accent-purple
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:cursor-pointer"
                />
                
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-500">Quick</span>
                  <span className="text-accent-purple font-medium">
                    {depthLabels[searchDepth]}
                  </span>
                  <span className="text-gray-500">Deep</span>
                </div>
              </div>
            </div>
            
            {/* Right panel - Q&A */}
            <div className="lg:col-span-2">
              <div className="glass rounded-2xl p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-accent-purple/20 to-accent-blue/20">
                    <Search className="w-5 h-5 text-accent-purple" />
                  </div>
                  <h2 className="text-lg font-semibold">Ask Questions</h2>
                </div>

                {/* Show question input only if files are uploaded */}
                {uploadedFiles.length > 0 ? (
                  <>
                    {/* Question input */}
                    <form onSubmit={handleQuery} className="mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="What would you like to know about your documents?"
                          className="w-full px-5 py-4 pr-14 rounded-xl bg-dark-700 border border-gray-700
                                   focus:border-accent-purple focus:outline-none focus:ring-2
                                   focus:ring-accent-purple/20 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!question.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg
                                   bg-gradient-to-r from-accent-purple to-accent-blue
                                   disabled:opacity-30 disabled:cursor-not-allowed
                                   hover:opacity-90 transition-opacity"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </form>

                    {/* Chat history */}
                    <div className="flex-1 overflow-y-auto space-y-4">
                      {chatHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <Search className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                          <p className="text-gray-500">Ask a question to get started</p>
                        </div>
                      ) : (
                        chatHistory.map((item, i) => (
                          <ChatItem key={i} item={item} />
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  /* Placeholder when no files uploaded */
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-accent-purple/10 to-accent-blue/10
                                    border-2 border-dashed border-gray-700 mb-4 inline-block">
                        <Upload className="w-16 h-16 text-gray-600 mx-auto" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-gray-300">
                        No Documents Yet
                      </h3>
                      <p className="text-gray-500">
                        Upload PDF files to start asking questions about your documents
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p className="mt-1">Swastik Sahoo • ASU - Computer Science</p>
        </footer>
      </div>
    </div>
  )
}

// Chat item component
function ChatItem({ item }) {
  const [expanded, setExpanded] = useState(true)
  
  return (
    <div className="rounded-xl bg-dark-700/50 overflow-hidden">
      {/* Question */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-dark-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-accent-purple/20">
            <Search className="w-4 h-4 text-accent-purple" />
          </div>
          <span className="font-medium text-left">{item.question}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">{item.timestamp}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      
      {/* Answer */}
      {expanded && (
        <div className="px-5 pb-5">
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent-purple/5 to-accent-blue/5 
                        border border-accent-purple/10 mb-4">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
              {item.answer}
            </p>
          </div>
          
          {/* Sources */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400 font-medium">
              Sources ({item.sources.length})
            </p>
            {item.sources.map((source, j) => (
              <div key={j} className="p-3 rounded-lg bg-dark-800 text-sm">
                <div className="flex items-center gap-2 text-accent-blue font-medium mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  {source.paper} • Page {source.page}
                </div>
                <p className="text-gray-400 text-xs line-clamp-2">
                  {source.content_preview}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
