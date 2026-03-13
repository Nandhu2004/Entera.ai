import os
import uuid

from huggingface_hub import InferenceClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

from .embeddings import embed_query, embed_documents
from .loader import split_document, extract_pdf_text
from .vectorstore import client, COLLECTION_NAME

HF_TOKEN = os.getenv("HF_TOKEN")
HF_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"

llm_client = InferenceClient(
    model=HF_MODEL,
    token=HF_TOKEN
)


def generate_answer(context: str, question: str):

    if not context.strip():
        return "No relevant information found in your documents."

    response = llm_client.chat_completion(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an enterprise document assistant. "
                    "Answer ONLY using the provided context. "
                    "Give concise answers for employees. "
                    "If the question is a calculation, return ONLY the final result. "
                    "If the answer is not in the context, say information insufficient."
                )
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion:\n{question}"
            }
        ],
        max_tokens=300,
        temperature=0.1
    )

    return response.choices[0].message.content


def store_document(contents, user_id, filename):

    full_text = extract_pdf_text(contents)
    docs = split_document(full_text)

    texts = [doc.page_content for doc in docs]
    vectors = embed_documents(texts)

    doc_id = str(uuid.uuid4())
    points = []

    for idx, vector in enumerate(vectors):
        points.append({
            "id": str(uuid.uuid4()),
            "vector": vector,
            "payload": {
                "user_id": user_id,
                "doc_id": doc_id,
                "chunk_index": idx,
                "text": texts[idx],
                "filename": filename
            }
        })

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )

    return doc_id


def query_document(user_id, question):

    query_vector = embed_query(question)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="user_id",
                    match=MatchValue(value=user_id)
                )
            ]
        ),
        limit=4
    )

    hits = results.points

    context = " ".join([hit.payload["text"] for hit in hits])

    answer = generate_answer(context, question)

    return {"answer": answer, "sources": []}