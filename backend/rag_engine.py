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
        
        # Free local embeddings
        print("Loading embedding model...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        print("Embedding model loaded!")
        
        # Groq LLM (FREE!)
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=1024
        )
        
        # Text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        self.vectorstore = None
        self.loaded_papers: List[str] = []
    
    def load_pdf(self, pdf_path: str) -> List[Document]:
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        
        loader = PyPDFLoader(pdf_path)
        pages = loader.load()
        
        filename = os.path.basename(pdf_path)
        for page in pages:
            page.metadata["source"] = filename
            page.metadata["paper"] = filename.replace(".pdf", "")
        
        chunks = self.text_splitter.split_documents(pages)
        print(f"Loaded {filename}: {len(pages)} pages → {len(chunks)} chunks")
        return chunks
    
    def create_vectorstore(self, documents: List[Document]) -> None:
        if not documents:
            raise ValueError("No documents to index!")
        
        print(f"Creating vector store with {len(documents)} chunks...")
        self.vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.persist_directory
        )
        print("Vector store created!")
    
    def query(self, question: str, k: int = 4) -> Dict[str, Any]:
        if not self.vectorstore:
            raise ValueError("No vector store loaded!")
        
        retriever = self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": k}
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
You are a helpful research assistant. Answer the question based ONLY on the provided context. 
If the context doesn't contain enough information, say so clearly.
Cite sources using [Source N] format.

Context:
{context}

Question: {question}

Answer:""")
        
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