from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
import os

COLLECTION_NAME = "enterprise_rag"
QDRANT_HOST = os.getenv("QDRANT_HOST", "qdrant")
client = QdrantClient(host=QDRANT_HOST, port=6333)


def init_collection():

    if COLLECTION_NAME not in [c.name for c in client.get_collections().collections]:

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=384,
                distance=Distance.COSINE
            )
        )