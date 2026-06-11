import os
from huggingface_hub import InferenceClient

HF_TOKEN = os.getenv("HF_TOKEN")

client = InferenceClient(token=HF_TOKEN)

def embed_query(text):
    return client.feature_extraction(
        text,
        model="sentence-transformers/all-MiniLM-L6-v2"
    ).tolist()

def embed_documents(texts):
    return [
        client.feature_extraction(
            text,
            model="sentence-transformers/all-MiniLM-L6-v2"
        ).tolist()
        for text in texts
    ]