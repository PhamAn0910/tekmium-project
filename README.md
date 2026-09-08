# Tekmium Project

# DevDocs RAG

An AI-powered documentation assistant that uses Retrieval-Augmented
Generation (RAG) to answer questions based on uploaded technical
documentation.

The goal of this project is to understand and implement the complete
RAG pipeline from document ingestion to retrieval, generation, and
source citation.

---

## 1. Project Overview

### Problem

Developers frequently need to search through large amounts of
technical documentation such as:

- README files
- API documentation
- Architecture documents
- Technical specifications
- Tutorials
- Internal documentation

Traditional keyword search can require users to know exactly what
they are looking for, while an LLM without access to the documents
cannot reliably answer questions about private or project-specific
information.

### Solution

DevDocs RAG allows users to upload technical documentation and ask
questions about it.

Instead of sending the entire document directly to an LLM, the
application:

1. Processes the document
2. Splits it into smaller chunks
3. Converts chunks into embeddings
4. Stores the embeddings in a vector database
5. Retrieves the most relevant chunks for a question
6. Provides the retrieved context to an LLM
7. Generates an answer grounded in the retrieved information
8. Displays the sources used to generate the answer

---

## 2. Project Goal

The goal is to build a small but functional RAG application and
understand the fundamental components of a Retrieval-Augmented
Generation system.

### MVP

- [ ] Upload a document
- [ ] Extract document text
- [ ] Split text into chunks
- [ ] Generate embeddings
- [ ] Store embeddings in a vector database
- [ ] Retrieve relevant chunks
- [ ] Generate an answer using an LLM
- [ ] Display the sources used for the answer

The application does not aim to be production-ready.

---

## 3. Example Use Case

### Input document

`react_documentation.pdf`

### User question

> What is the difference between Server Components and Client
> Components?

### Retrieval

The system searches the vector database and retrieves the most
relevant sections of the documentation.

### Generated answer

The LLM generates an answer using the retrieved documentation as
context.

### Sources

- `react_documentation.pdf` — Page 12
- `react_documentation.pdf` — Page 18

The answer should be grounded in the retrieved sources rather than
relying only on the LLM's pre-existing knowledge.

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
| LLM                 | Google Gemini 1.5 Flash (via Vercel AI SDK) |
| Embedding Model     | text-embedding-004 (via Vercel AI SDK)      |
| Vector Database     | Pinecone Serverless                         |
| Document Processing | Custom TypeScript Splitter                  |
| Language            | TypeScript                                  |

---

## 6. Limitations

The initial implementation may have several limitations:

* Retrieval quality depends heavily on chunking.
* Semantically similar chunks are not always the most useful chunks.
* Information spread across multiple chunks may be difficult to
  retrieve together.
* The LLM can still produce incorrect answers.
* Supported document formats may be limited.
* The system may perform poorly on very large or complex documents.

---

## 7. Future Improvements

If the basic RAG pipeline works successfully, possible improvements
include:

### Retrieval

* Hybrid search
* Reranking
* Query expansion
* Query rewriting
* Metadata filtering

### Documents

* Support more file formats
* Preserve document structure
* Better handling of tables and code
* Improved chunking strategies

### Answer quality

* Better citation accuracy
* Confidence / relevance indicators
* "I don't know" behavior when evidence is insufficient

### Evaluation

Create a small evaluation dataset containing:

```text
Question
Expected Source
Expected Answer
```

Then measure:

* Retrieval accuracy
* Context relevance
* Answer faithfulness
* Citation accuracy

---

## 8. Out of Scope

* Production deployment
* Authentication
* Complex user management
* Large-scale infrastructure
* Advanced agent systems

---

## 9. Getting Started

### Prerequisites

* Node.js / Python
* API key for the selected LLM
* Vector database

### Installation

```bash
# Clone repository
git clone <repository-url>

# Install dependencies
...

# Configure environment variables
...

# Start application
...
```

---

## 10. Project Status

### Current status
In development

### Progress

* [ ] Project setup
* [ ] Document ingestion
* [ ] Text extraction
* [ ] Chunking
* [ ] Embeddings
* [ ] Vector database
* [ ] Retrieval
* [ ] LLM integration
* [ ] Source citation
* [ ] Basic UI
* [ ] Evaluation