"""
RAG Engine for DocuSearch
Core logic: PDF loading, chunking, embedding, retrieval, generation
"""

import os
from typing import List, Dict, Any
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document


class PaperQA:
    def __init__(self, groq_api_key: str, persist_directory: str = "./chroma_db"):
        self.groq_api_key = groq_api_key
        self.persist_directory = persist_directory
        
        # Better embeddings - BAAI/bge-small-en-v1.5 is much more accurate
        print("Loading embedding model (this may take a moment)...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        print("Embedding model loaded!")
        
        # Groq LLM (FREE!) - using best model with more tokens
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=2048  # Increased for more detailed answers
        )
        
        # Text splitter - larger chunks for better context
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=300,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        self.vectorstore = None
        self.loaded_papers: List[str] = []
    
    def load_pdf(self, pdf_path: str) -> List[Document]:
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        try:
            loader = PyPDFLoader(pdf_path)
            pages = loader.load()

            filename = os.path.basename(pdf_path)

            # Clean text to remove problematic Unicode characters
            for page in pages:
                # Replace common Unicode characters that cause issues
                page.page_content = page.page_content.encode('ascii', 'ignore').decode('ascii')
                page.metadata["source"] = filename
                page.metadata["paper"] = filename.replace(".pdf", "")

            chunks = self.text_splitter.split_documents(pages)
            # Encode filename for safe printing on Windows console
            safe_filename = filename.encode('ascii', 'ignore').decode('ascii')
            print(f"Loaded {safe_filename}: {len(pages)} pages -> {len(chunks)} chunks")
            return chunks
        except Exception as e:
            # If PDF loading fails, raise a more informative error
            filename = os.path.basename(pdf_path)
            safe_filename = filename.encode('ascii', 'ignore').decode('ascii')
            raise ValueError(f"{safe_filename}: {str(e)}")
    
    def create_vectorstore(self, documents: List[Document]) -> None:
        if not documents:
            raise ValueError("No documents to index!")

        if self.vectorstore is None:
            # First upload - create new vectorstore
            print(f"Creating vector store with {len(documents)} chunks...")
            self.vectorstore = Chroma.from_documents(
                documents=documents,
                embedding=self.embeddings,
                persist_directory=self.persist_directory
            )
            print("Vector store created!")
        else:
            # Subsequent uploads - add to existing vectorstore
            print(f"Adding {len(documents)} chunks to existing vector store...")
            self.vectorstore.add_documents(documents)
            print("Documents added to vector store!")
    
    def query(self, question: str, k: int = 4) -> Dict[str, Any]:
        if not self.vectorstore:
            raise ValueError("No vector store loaded!")

        # Use MMR (Maximum Marginal Relevance) for better diversity and relevance
        retriever = self.vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": k,
                "fetch_k": k * 3,  # Fetch more candidates then filter
                "lambda_mult": 0.7  # Balance between relevance (1.0) and diversity (0.0)
            }
        )

        relevant_docs = retriever.invoke(question)
        
        context_parts = []
        sources = []
        
        for i, doc in enumerate(relevant_docs):
            context_parts.append(f"[Source {i+1}]: {doc.page_content}")
            sources.append({
                "paper": doc.metadata.get("paper", "Unknown"),
                "page": doc.metadata.get("page", "Unknown"),
                "content_preview": doc.page_content[:200] + "..."
            })
        
        context = "\n\n".join(context_parts)
        
        prompt = ChatPromptTemplate.from_template("""
You are an expert research assistant analyzing academic documents. Your task is to provide accurate, detailed answers based ONLY on the provided context.

INSTRUCTIONS:
1. Read ALL the provided sources carefully before answering
2. Answer the question thoroughly using information from the context
3. Cite specific sources using [Source N] format when making claims
4. If multiple sources contain relevant information, synthesize them
5. If the context lacks sufficient information, explicitly state: "The provided documents do not contain enough information to answer this question"
6. Be specific and detailed - include relevant facts, numbers, and examples from the sources
7. Do not make assumptions or add information not present in the context

CONTEXT FROM DOCUMENTS:
{context}

USER QUESTION: {question}

DETAILED ANSWER:""")
        
        chain = prompt | self.llm
        response = chain.invoke({"context": context, "question": question})
        
        return {
            "answer": response.content,
            "sources": sources,
            "num_sources": len(sources)
        }
    
    def remove_file(self, filename: str) -> Dict[str, Any]:
        """Remove all chunks from a specific file from the vector store"""
        if not self.vectorstore:
            raise ValueError("No vector store loaded!")

        # Get the collection from Chroma
        collection = self.vectorstore._collection

        # Find all document IDs that match this filename
        # Query by metadata to find documents from this file
        results = collection.get(
            where={"source": filename}
        )

        if not results or not results['ids']:
            raise ValueError(f"No documents found for {filename}")

        # Delete the documents
        collection.delete(ids=results['ids'])

        # Remove from loaded papers list
        paper_name = filename.replace(".pdf", "")
        if paper_name in self.loaded_papers:
            self.loaded_papers.remove(paper_name)

        remaining_count = collection.count()

        return {
            "status": "success",
            "removed_chunks": len(results['ids']),
            "remaining_chunks": remaining_count
        }

    def get_stats(self) -> Dict[str, Any]:
        if not self.vectorstore:
            return {"status": "No documents loaded"}

        collection = self.vectorstore._collection
        return {
            "total_chunks": collection.count(),
            "loaded_papers": self.loaded_papers,
        }