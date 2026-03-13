import os
import json
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from dotenv import load_dotenv

load_dotenv()
def extract_pdf_text(file_bytes):

    endpoint = os.getenv("AZURE_ENDPOINT")
    key = os.getenv("AZURE_API_KEY")

    client = DocumentIntelligenceClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(key)
    )

    poller = client.begin_analyze_document(
        "prebuilt-layout",
        body=file_bytes,
        content_type="application/pdf"
    )

    result = poller.result()

    pdf_text = ""
    tables_data = []

    for page in result.pages:
        page_text = " ".join([line.content for line in page.lines])
        pdf_text += page_text + "\n"

    for table in result.tables:

        grid = {}
        headers = {}

        for cell in table.cells:
            row = cell.row_index
            col = cell.column_index
            if row == 0:
                headers[col] = cell.content
            else:
                if row not in grid:
                    grid[row] = {}
                grid[row][col] = cell.content

        structured_table = []

        for row_idx, row_data in grid.items():
            row_dict = {}
            for col, value in row_data.items():
                column_name = headers.get(col, f"col_{col}")
                row_dict[column_name] = value
            structured_table.append(row_dict)

        if structured_table:
            tables_data.append(structured_table)

    tables_json = json.dumps(tables_data)

    final_document = f"""
TEXT CONTENT:
{pdf_text}

TABLE DATA:
{tables_json}
"""

    return final_document


def split_document(text: str):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,
        chunk_overlap=250
    )

    docs = splitter.split_documents(
        [Document(page_content=text, metadata={"source": "pdf"})]
    )

    return docs