import os
from azure.communication.email import EmailClient

def send_verification_email(user_email: str, token: str):
    connection_string = os.getenv("AZURE_EMAIL_CONNECTION_STRING")
    from_address = os.getenv("AZURE_EMAIL_FROM_ADDRESS")
    
    client = EmailClient.from_connection_string(connection_string)

    message = {
    "senderAddress": from_address,
    "recipients": {
        "to": [
            {
                "address": user_email
            }
        ]
    },
    "content": {
        "subject": "Verify your Entera.ai Account",
        "plainText": f"Welcome! Please verify your account here: http://localhost:8000/verify?token={token}",
        "html": f"<html><body><h1>Welcome!</h1><p>Please <a href='http://localhost:8000/verify?token={token}'>click here</a> to verify your account.</p></body></html>"
    }
}

    try:
        poller = client.begin_send(message)
        print(f"Email sent to {user_email}")
    except Exception as ex:
        print(f"Failed to send email: {ex}")