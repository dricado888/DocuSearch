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
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { GradientDots } from "@/components/ui/gradient-dots"

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

  // Calculating total size of files to MB
  const getTotalFileSize = () => {
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1)
    return totalMB
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
      await axios.post(`${API_URL}/remove-file`, { filename })
      setUploadedFiles(prev => prev.filter(f => f !== filename))
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
      setUploadedFiles([])
      setTotalChunks(0)
      setChatHistory([])
      setFiles([])
    } catch (err) {
      setError('Reset failed')
    }
  }

  const depthLabels = {
    2: 'Quick', 3: 'Quick', 4: 'Balanced',
    5: 'Balanced', 6: 'Deep', 7: 'Deep', 8: 'Thorough'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Animated gradient dots background */}
      <GradientDots
        duration={25}
        colorCycleDuration={8}
        dotSize={6}
        spacing={12}
        className="opacity-40"
      />

      {/* Main content */}
      <div className="container mx-auto px-6 py-8 max-w-7xl relative z-10">

        {/* Header - dark theme */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-serif font-bold text-white tracking-tight">
                DocuSearch Pro
              </h1>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Reset System
            </button>
          </div>
          <p className="text-neutral-400 text-base font-sans ml-13">
            Professional Document Analysis & Intelligence
          </p>
        </header>

        {/* Error display - dark theme */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 flex items-center gap-3 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-200 font-sans text-sm flex-1">{error}</span>
            <button onClick={() => setError('')} className="ml-auto hover:bg-red-900/50 rounded p-1 transition-colors">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        {/* Loading overlay - dark theme */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
              <p className="text-neutral-300 text-base font-sans font-medium">{loadingMessage}</p>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">

            {/* Left panel - Upload */}
            <div className="lg:col-span-1 space-y-5">

              {/* Upload card - dark theme with glowing effect */}
              <div className="relative bg-neutral-900/80 border border-neutral-800 rounded-xl shadow-xl p-6 backdrop-blur-sm">
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={2}
                />
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Upload className="w-5 h-5 text-orange-400" />
                  </div>
                  <h2 className="text-xl font-serif font-semibold text-white">Documents</h2>
                </div>

                {/* Drop zone - dark theme */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-700 rounded-lg p-8
                           text-center cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5
                           transition-all group"
                >
                  <FileText className="w-10 h-10 text-neutral-500 mx-auto mb-3
                                      group-hover:text-orange-400 transition-colors" />
                  <p className="text-neutral-400 text-sm font-sans">
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

                {/* Selected files - dark theme */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3
                                            rounded-md bg-neutral-800/50 border border-neutral-700
                                            hover:border-neutral-600 transition-colors">
                        <div className="flex items-center gap-2 truncate flex-1">
                          <File className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <span className="text-sm font-sans text-neutral-300 truncate">{file.name}</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="hover:bg-red-900/30 rounded p-1 transition-colors">
                          <X className="w-4 h-4 text-neutral-500 hover:text-red-400" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={handleUpload}
                      className="w-full py-2.5 rounded-lg bg-orange-500 text-white
                               font-sans font-medium hover:bg-orange-600 transition-colors
                               flex items-center justify-center gap-2 mt-3 shadow-lg shadow-orange-500/20"
                    >
                      <Upload className="w-4 h-4" />
                      Process {files.length} file{files.length > 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>

              {files.length > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-xs font-sans text-neutral-500">
                    Total: {getTotalFileSize()} MB / 50MB
                  </span>
                </div>
              )}

              {/* Indexed files - dark theme */}
              {uploadedFiles.length > 0 && (
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl shadow-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-serif font-semibold text-white">Indexed</h2>
                  </div>

                  <div className="space-y-2">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-2.5 rounded-md
                                            bg-neutral-800/50 border border-neutral-700 text-sm group hover:border-neutral-600 transition-colors">
                        <div className="flex items-center gap-2 truncate flex-1">
                          <BookOpen className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="truncate font-sans text-neutral-300">{file}</span>
                        </div>
                        <button
                          onClick={() => removeUploadedFile(file)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/30 rounded p-1"
                          title="Remove file"
                        >
                          <X className="w-4 h-4 text-neutral-500 hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400 font-sans">Total chunks</span>
                      <span className="text-orange-400 font-mono font-semibold">{totalChunks}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Search depth - dark theme */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl shadow-xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-neutral-800 border border-neutral-700">
                    <Sparkles className="w-5 h-5 text-neutral-400" />
                  </div>
                  <h2 className="text-xl font-serif font-semibold text-white">Search Depth</h2>
                </div>

                <input
                  type="range"
                  min="2"
                  max="8"
                  value={searchDepth}
                  onChange={(e) => setSearchDepth(parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:bg-orange-500
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-webkit-slider-thumb]:shadow-lg
                           [&::-webkit-slider-thumb]:shadow-orange-500/30"
                />

                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-neutral-500 font-sans">Quick</span>
                  <span className="text-orange-400 font-sans font-semibold">{depthLabels[searchDepth]}</span>
                  <span className="text-neutral-500 font-sans">Deep</span>
                </div>
              </div>
            </div>

            {/* Right panel - Q&A - dark theme */}
            <div className="lg:col-span-2">
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl shadow-xl p-6 h-full flex flex-col backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Search className="w-5 h-5 text-orange-400" />
                  </div>
                  <h2 className="text-2xl font-serif font-semibold text-white">Ask Questions</h2>
                </div>

                {/* Show question input only if files are uploaded */}
                {uploadedFiles.length > 0 ? (
                  <>
                    {/* Question input - dark theme */}
                    <form onSubmit={handleQuery} className="mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="What would you like to know about your documents?"
                          className="w-full px-5 py-4 pr-14 rounded-lg bg-neutral-800/50 border border-neutral-700
                                   focus:border-orange-500/50 focus:outline-none focus:ring-2
                                   focus:ring-orange-500/20 transition-all font-sans text-white
                                   placeholder:text-neutral-500"
                        />
                        <button
                          type="submit"
                          disabled={!question.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg
                                   bg-orange-500 text-white
                                   disabled:opacity-30 disabled:cursor-not-allowed
                                   hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </form>

                    {/* Chat history */}
                    <div className="flex-1 overflow-y-auto space-y-4">
                      {chatHistory.length === 0 ? (
                        <div className="text-center py-16">
                          <Search className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                          <p className="text-neutral-500 font-sans">Ask a question to get started</p>
                        </div>
                      ) : (
                        chatHistory.map((item, i) => (
                          <ChatItem key={i} item={item} />
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  // Placeholder when no files uploaded - dark theme
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="p-6 rounded-lg bg-neutral-800/50 border-2 border-dashed border-neutral-700 mb-4 inline-block">
                        <Upload className="w-16 h-16 text-neutral-600 mx-auto" />
                      </div>
                      <h3 className="text-xl font-serif font-semibold mb-2 text-neutral-300">
                        No Documents Yet
                      </h3>
                      <p className="text-neutral-500 font-sans">
                        Upload PDF files to start asking questions about your documents
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Footer - dark theme */}
        <footer className="text-center mt-16 pt-8 border-t border-neutral-800">
          <p className="text-neutral-500 font-sans text-sm">
            Built by <span className="font-semibold text-neutral-300">Swastik Sahoo</span>
            {' • '}
            <span className="text-neutral-600">Arizona State University</span>
            {' • '}
            <span className="text-neutral-600">Computer Science</span>
          </p>
        </footer>
      </div>
    </div>
  )
}

// Chat item component - Dark theme Q&A display
function ChatItem({ item }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 shadow-xl overflow-hidden
                    hover:border-neutral-700 transition-all backdrop-blur-sm">
      {/* Question Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between
                   hover:bg-neutral-800/30 transition-colors group"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20
                         group-hover:bg-orange-500/20 transition-colors">
            <Search className="w-4 h-4 text-orange-400" />
          </div>
          <span className="font-sans font-medium text-white text-left">
            {item.question}
          </span>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <span className="text-neutral-500 text-sm font-mono">{item.timestamp}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          )}
        </div>
      </button>

      {/* Answer Section */}
      {expanded && (
        <div className="px-6 pb-5 bg-neutral-800/20">
          <div className="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700 mb-4">
            <p className="text-technical text-neutral-200 leading-relaxed whitespace-pre-wrap">
              {item.answer}
            </p>
          </div>

          {/* Sources */}
          {item.sources && item.sources.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-neutral-400 font-sans font-semibold mb-3">
                Sources ({item.sources.length})
              </p>
              {item.sources.map((source, j) => (
                <div key={j} className="p-3.5 rounded-lg bg-neutral-800/30 border border-neutral-700
                                       hover:border-orange-500/30 hover:bg-orange-500/5
                                       transition-all">
                  <div className="flex items-center gap-2 text-orange-400 font-sans
                                font-medium mb-2 text-sm">
                    <FileText className="w-4 h-4" />
                    <span>{source.paper}</span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400">Page {source.page}</span>
                  </div>
                  <p className="text-neutral-400 text-xs font-sans leading-relaxed line-clamp-2">
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
