import uuid
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Boolean
from qdrant_client.models import Filter, FieldCondition, MatchValue
from RAG.vectorstore import client, COLLECTION_NAME
from RAG.vectorstore import init_collection
from RAG.qa_chain import store_document, query_document
from auth import create_access_token, verify_password, get_password_hash, get_current_user
from database import get_db, engine, Base
from mailer import send_verification_email

import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


# -----------------------------
# Database Model
# -----------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)

    hashed_password = Column(String)

    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, unique=True, nullable=True)


# -----------------------------
# Startup / Lifespan
# -----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):

    # Initialize Postgres
    try:
        print("Starting Postgres table creation...")
        Base.metadata.create_all(bind=engine)
        print("Postgres tables created successfully!")
    except Exception as e:
        print(f"Error creating Postgres tables: {e}")

    # Initialize Qdrant
    try:
        print("Initializing Qdrant...")
        init_collection()
        print("Qdrant ready!")
    except Exception as e:
        print(f"Error initializing Qdrant: {e}")

    yield


app = FastAPI(lifespan=lifespan)


# -----------------------------
# Middleware
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
        "http://127.0.0.1:3000","https://entera-ai.vercel.app",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Signup
# -----------------------------
@app.post("/signup")
async def signup(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):

    # Check if email exists
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_pw = get_password_hash(password)

    token = str(uuid.uuid4())

    new_user = User(
        username=username,
        email=email,
        hashed_password=hashed_pw,
        verification_token=token,
        is_verified=False
    )

    db.add(new_user)
    db.commit()

    try:
        send_verification_email(email, token)
    except Exception as e:
        print(f"Email send failed: {e}")

    return {"message": f"Verification email sent to {email}. Please verify to login."}


# -----------------------------
# Email Verification
# -----------------------------
@app.get("/verify")
async def verify_email(token: str, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.verification_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user.is_verified = True
    user.verification_token = None

    db.commit()

    return {"message": "Email verified successfully! You can now log in."}


# -----------------------------
# Login
# -----------------------------
@app.post("/token")
async def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    try:
        logger.debug(f"Login attempt: email={email}")
        logger.debug(f"Raw password length: {len(password.encode('utf-8'))} bytes")
        
        # Truncate password
        safe_password = password.encode("utf-8")[:72].decode("utf-8", "ignore")
        logger.debug(f"Safe password: {safe_password}")
        
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(safe_password, user.hashed_password):
            logger.debug("User not found or password mismatch")
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
        if not user.is_verified:
            logger.debug("User not verified")
            raise HTTPException(status_code=403, detail="Account not verified")
        
        access_token = create_access_token(data={"sub": user.email})
        logger.debug(f"Access token created: {access_token}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "username": user.username
        }
    
    except Exception as e:
        # THIS WILL SHOW THE FULL TRACE IN TERMINAL
        logger.exception("/token internal error")
        raise HTTPException(status_code=500, detail=str(e))
# -----------------------------
# Upload Document
# -----------------------------
@app.post("/upload")
async def upload_file(
    user_id: str = Depends(get_current_user),
    file: UploadFile = File(...)
):

    contents = await file.read()

    doc_id = store_document(contents, user_id, file.filename)

    return {
        "message": "Document processed and stored in Qdrant",
        "doc_id": doc_id,
        "owner": user_id
    }


# -----------------------------
# Ask Question
# -----------------------------
@app.post("/ask")
async def ask(
    user_id: str = Depends(get_current_user),
    question: str = Form(...)
):

    result = query_document(user_id, question)

    return result

@app.get("/documents")
async def get_documents(user_id: str = Depends(get_current_user)):
    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=Filter(
            must=[
                FieldCondition(
                    key="user_id",
                    match=MatchValue(value=user_id)
                )
            ]
        ),
        limit=1000, # Increased limit to ensure we catch all chunks for deduping
        with_payload=True,
        with_vectors=False
    )

    # 1. Extract payload and handle deduplication
    # Since Qdrant stores chunks, multiple points will have the same doc_id
    unique_docs = {}
    for point in points:
        payload = point.payload
        doc_id = payload.get("doc_id")
        
        if doc_id and doc_id not in unique_docs:
            unique_docs[doc_id] = {
                "doc_id": doc_id,
                "filename": payload.get("filename", "Unknown Document"),
                "owner": payload.get("owner", user_id),
                "upload_date": payload.get("upload_date"),
                "type": payload.get("type", "PDF")
            }

    # Return as a clean list for the frontend
    return list(unique_docs.values())
    
    # Deduplicate by doc_id — each doc has multiple chunks
    seen = {}
    for point in results[0]:
        doc_id = point.payload["doc_id"]
        if doc_id not in seen:
            seen[doc_id] = {
                "doc_id": doc_id,
                "filename": point.payload["filename"],
                "owner": point.payload["user_id"],
            }
    
    return list(seen.values())


@app.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str, 
    user_id: str = Depends(get_current_user)
):
    try:
        logger.debug(f"Attempting to delete doc_id: {doc_id} for user: {user_id}")
        
        # Qdrant delete returns the operation status
        result = client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(key="doc_id", match=MatchValue(value=doc_id)),
                    FieldCondition(key="user_id", match=MatchValue(value=user_id))
                ]
            )
        )
        
        # Note: Qdrant delete is asynchronous at the cluster level; 
        # it usually returns "acknowledged" even if no points matched.
        return {"status": "success", "message": f"Delete request for {doc_id} processed"}
        
    except Exception as e:
        logger.error(f"Error during deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Delete failed: {str(e)}"
        )