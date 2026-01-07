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
  // State management (API key removed - now in backend .env)
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
    <div className="min-h-screen bg-brand-grey-50">
      {/* Main content */}
      <div className="container mx-auto px-6 py-8 max-w-7xl">

        {/* Header - clean, professional */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-orange-500 flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-serif font-bold text-brand-black tracking-tight">
                DocuSearch Pro
              </h1>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-brand-grey-600 hover:text-brand-grey-900 transition-colors"
            >
              Reset System
            </button>
          </div>
          <p className="text-brand-grey-600 text-base font-sans ml-13">
            Professional Document Analysis & Intelligence
          </p>
        </header>

        {/* Error display - professional alert */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800 font-sans text-sm flex-1">{error}</span>
            <button onClick={() => setError('')} className="ml-auto hover:bg-red-100 rounded p-1 transition-colors">
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}

        {/* Loading overlay - minimal professional */}
        {isLoading && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-brand-orange-500 animate-spin mx-auto mb-4" />
              <p className="text-brand-grey-700 text-base font-sans font-medium">{loadingMessage}</p>
            </div>
          </div>
        )}

        {/* No initialization required - just start using! */}
        <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left panel - Upload */}
            <div className="lg:col-span-1 space-y-5">

              {/* Upload card - clean professional */}
              <div className="bg-white border border-brand-grey-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-brand-orange-50 border border-brand-orange-100">
                    <Upload className="w-5 h-5 text-brand-orange-600" />
                  </div>
                  <h2 className="text-xl font-serif font-semibold text-brand-black">Documents</h2>
                </div>

                {/* Drop zone - minimal professional */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-brand-grey-300 rounded-lg p-8
                           text-center cursor-pointer hover:border-brand-orange-400 hover:bg-brand-orange-50/30
                           transition-all group"
                >
                  <FileText className="w-10 h-10 text-brand-grey-400 mx-auto mb-3
                                      group-hover:text-brand-orange-500 transition-colors" />
                  <p className="text-brand-grey-600 text-sm font-sans">
                    Click to select PDF documents
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

                {/* Selected files - clean list */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3
                                            rounded-md bg-brand-grey-50 border border-brand-grey-200
                                            hover:border-brand-grey-300 transition-colors">
                        <div className="flex items-center gap-2 truncate flex-1">
                          <File className="w-4 h-4 text-brand-orange-500 flex-shrink-0" />
                          <span className="text-sm font-sans text-brand-grey-700 truncate">{file.name}</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="hover:bg-red-50 rounded p-1 transition-colors">
                          <X className="w-4 h-4 text-brand-grey-500 hover:text-red-600" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={handleUpload}
                      className="w-full py-2.5 rounded-lg bg-brand-orange-500 text-white
                               font-sans font-medium hover:bg-brand-orange-600 transition-colors
                               flex items-center justify-center gap-2 mt-3 shadow-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Process {files.length} file{files.length > 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Indexed files */}
              {uploadedFiles.length > 0 && (
                <div className="bg-white border border-brand-grey-200 rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="text-xl font-serif font-semibold text-brand-black">Indexed</h2>
                  </div>

                  <div className="space-y-2">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-2.5 rounded-md
                                            bg-brand-grey-50 border border-brand-grey-200 text-sm group hover:border-brand-grey-300 transition-colors">
                        <div className="flex items-center gap-2 truncate flex-1">
                          <BookOpen className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="truncate font-sans text-brand-grey-700">{file}</span>
                        </div>
                        <button
                          onClick={() => removeUploadedFile(file)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded p-1"
                          title="Remove file"
                        >
                          <X className="w-4 h-4 text-brand-grey-500 hover:text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-brand-grey-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-brand-grey-600 font-sans">Total chunks</span>
                      <span className="text-brand-orange-600 font-mono font-semibold">{totalChunks}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Search depth */}
              <div className="bg-white border border-brand-grey-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-brand-grey-100 border border-brand-grey-200">
                    <Sparkles className="w-5 h-5 text-brand-grey-700" />
                  </div>
                  <h2 className="text-xl font-serif font-semibold text-brand-black">Search Depth</h2>
                </div>

                <input
                  type="range"
                  min="2"
                  max="8"
                  value={searchDepth}
                  onChange={(e) => setSearchDepth(parseInt(e.target.value))}
                  className="w-full h-2 bg-brand-grey-200 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:bg-brand-orange-500
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-webkit-slider-thumb]:shadow-sm"
                />

                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-brand-grey-500 font-sans">Quick</span>
                  <span className="text-brand-orange-600 font-sans font-semibold">{depthLabels[searchDepth]}</span>
                  <span className="text-brand-grey-500 font-sans">Deep</span>
                </div>
              </div>
            </div>

            {/* Right panel - Q&A */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-brand-grey-200 rounded-lg shadow-sm p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-brand-orange-50 border border-brand-orange-100">
                    <Search className="w-5 h-5 text-brand-orange-600" />
                  </div>
                  <h2 className="text-2xl font-serif font-semibold text-brand-black">Ask Questions</h2>
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
                          className="w-full px-5 py-4 pr-14 rounded-lg bg-white border border-brand-grey-300
                                   focus:border-brand-orange-400 focus:outline-none focus:ring-2
                                   focus:ring-brand-orange-100 transition-all font-sans text-brand-grey-900
                                   placeholder:text-brand-grey-400"
                        />
                        <button
                          type="submit"
                          disabled={!question.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg
                                   bg-brand-orange-500 text-white
                                   disabled:opacity-30 disabled:cursor-not-allowed
                                   hover:bg-brand-orange-600 transition-colors shadow-sm"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </form>

                    {/* Chat history */}
                    <div className="flex-1 overflow-y-auto space-y-4">
                      {chatHistory.length === 0 ? (
                        <div className="text-center py-16">
                          <Search className="w-16 h-16 text-brand-grey-300 mx-auto mb-4" />
                          <p className="text-brand-grey-500 font-sans">Ask a question to get started</p>
                        </div>
                      ) : (
                        chatHistory.map((item, i) => (
                          <ChatItem key={i} item={item} />
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  // Placeholder when no files uploaded
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="p-6 rounded-lg bg-brand-grey-50 border-2 border-dashed border-brand-grey-300 mb-4 inline-block">
                        <Upload className="w-16 h-16 text-brand-grey-400 mx-auto" />
                      </div>
                      <h3 className="text-xl font-serif font-semibold mb-2 text-brand-grey-700">
                        No Documents Yet
                      </h3>
                      <p className="text-brand-grey-500 font-sans">
                        Upload PDF files to start asking questions about your documents
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Footer */}
        <footer className="text-center mt-16 pt-8 border-t border-brand-grey-200">
          <p className="text-brand-grey-500 font-sans text-sm">
            Built by <span className="font-semibold text-brand-grey-700">Swastik Sahoo</span>
            {' • '}
            <span className="text-brand-grey-400">Arizona State University</span>
            {' • '}
            <span className="text-brand-grey-400">Computer Science</span>
          </p>
        </footer>
      </div>
    </div>
  )
}

// Chat item component - Professional Q&A display
function ChatItem({ item }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-lg border border-brand-grey-200 bg-white shadow-sm overflow-hidden
                    hover:border-brand-grey-300 hover:shadow-md transition-all">
      {/* Question Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between
                   hover:bg-brand-grey-50 transition-colors group"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-brand-orange-50 border border-brand-orange-100
                         group-hover:bg-brand-orange-100 transition-colors">
            <Search className="w-4 h-4 text-brand-orange-600" />
          </div>
          <span className="font-sans font-medium text-brand-black text-left">
            {item.question}
          </span>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <span className="text-brand-grey-400 text-sm font-mono">{item.timestamp}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-brand-grey-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-grey-400" />
          )}
        </div>
      </button>

      {/* Answer Section */}
      {expanded && (
        <div className="px-6 pb-5 bg-brand-grey-50/50">
          <div className="p-5 rounded-lg bg-white border border-brand-grey-200 mb-4">
            <p className="text-technical text-brand-grey-800 leading-relaxed whitespace-pre-wrap">
              {item.answer}
            </p>
          </div>

          {/* Sources */}
          {item.sources && item.sources.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-brand-grey-600 font-sans font-semibold mb-3">
                Sources ({item.sources.length})
              </p>
              {item.sources.map((source, j) => (
                <div key={j} className="p-3.5 rounded-lg bg-white border border-brand-grey-200
                                       hover:border-brand-orange-200 hover:bg-brand-orange-50/30
                                       transition-all">
                  <div className="flex items-center gap-2 text-brand-orange-600 font-sans
                                font-medium mb-2 text-sm">
                    <FileText className="w-4 h-4" />
                    <span>{source.paper}</span>
                    <span className="text-brand-grey-400">•</span>
                    <span className="text-brand-grey-600">Page {source.page}</span>
                  </div>
                  <p className="text-brand-grey-600 text-xs font-sans leading-relaxed line-clamp-2">
                    {source.content_preview}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
