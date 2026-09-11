# Tekmium Project: RAG

A small RAG (Retrieval-Augmented Generation) application that answers
questions based on a knowledge base, with source citation.

The goal of this project is to understand and implement the core RAG
pipeline: text → chunks → embeddings → vector DB → retrieval →
LLM answer with sources.

---

## 1. Project Overview

### Problem

An LLM without access to specific documents cannot reliably answer
questions about private or domain-specific information. Traditional
keyword search requires users to know exactly what they are looking
for.

### Solution

This RAG takes a knowledge base, splits it into chunks, embeds
them into a vector database, and uses the most relevant chunks as
context when answering questions. The answer includes references to
the source chunks used.

The pipeline:

1. Load text data from the knowledge base
2. Split into smaller chunks
3. Convert chunks into embeddings
4. Store embeddings in a vector database
5. Retrieve the most relevant chunks for a question
6. Provide the retrieved context to an LLM
7. Generate an answer grounded in the retrieved information
8. Display the source chunks used to generate the answer

---

## 2. Project Goal

The goal is to build a small but functional RAG application and
understand the fundamental components of a Retrieval-Augmented
Generation system.

### MVP

- [ ] Load and chunk the knowledge base
- [ ] Generate embeddings
- [ ] Store embeddings in a vector database
- [ ] Retrieve relevant chunks for a question
- [ ] Generate an answer using an LLM
- [ ] Display the source chunks used for the answer

The application does not aim to be production-ready.

---

## 3. Example Use Case

Using the FiQA dataset (`dataset/knowledge_base.jsonl`):

1. Knowledge base is chunked and embedded into the vector database
2. User asks: *"How to deposit a cheque issued to an associate in my business into my business account?"*
3. System retrieves the most relevant chunks from the vector database
4. LLM generates an answer using the retrieved chunks as context
5. Answer is displayed with the source chunks used
6. The answer can be compared against the reference in `test_cases.json`

---

## 4. RAG Architecture

```text
                    ┌──────────────┐
                    │     User     │
                    └──────┬───────┘
                           │
                    Upload document
                           │
                           ▼
                 ┌──────────────────┐
                 │ Text Extraction  │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │    Chunking      │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │    Embedding     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   Vector DB      │
                 └────────┬─────────┘
                          │
                          │
        ┌─────────────────┘
        │
        │ User question
        ▼
 ┌──────────────────┐
 │ Query Embedding  │
 └────────┬─────────┘
          │
          ▼
 ┌──────────────────┐
 │ Similarity Search│
 └────────┬─────────┘
          │
          ▼
 ┌──────────────────┐
 │ Relevant Chunks  │
 └────────┬─────────┘
          │
          ▼
 ┌──────────────────┐
 │       LLM        │
 └────────┬─────────┘
          │
          ▼
 ┌──────────────────┐
 │ Answer + Sources │
 └──────────────────┘
````

---

## 5. Tech Stack

| Component           | Technology                                  |
| ------------------- | ------------------------------------------- |
| Frontend            | Next.js (App Router, Tailwind CSS)          |
| Backend             | Next.js Route Handlers (Vercel Serverless)  |
| LLM                 | Google Gemini 3.6 Flash (via Vercel AI SDK) |
| Embedding Model     | gemini-embedding-001 (3072 dims, via Vercel AI SDK) |
| Vector Database     | Pinecone Serverless                         |
| Document Processing | Custom TypeScript Splitter                  |
| Language            | TypeScript                                  |

---

## 6. Out of Scope

* Production-level deployment and authentication
* Advanced retrieval (hybrid search, reranking, query rewriting)
* Complex file parsing (tables, images, scanned PDFs)
* Formal evaluation pipelines
* Multi-user support

---

## 7. Getting Started

### Prerequisites

* Node.js (v18+)
* Google Gemini API key
* Pinecone API key

### Installation

```bash
git clone <repository-url>
cd tekmium-project
npm install

# Add API keys to .env.local
cp .env.example .env.local

npm run dev
```

---

## 8. Project Status

In development.

### Progress

* [x] Project setup
* [x] Chunking
* [x] Embeddings + vector database
* [x] Retrieval
* [x] LLM integration + source citation
* [x] Basic UI