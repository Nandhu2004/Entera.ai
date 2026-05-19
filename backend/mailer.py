import os
from azure.communication.email import EmailClient

def send_verification_email(user_email: str, token: str):
    connection_string = os.getenv("AZURE_EMAIL_CONNECTION_STRING")
    from_address = os.getenv("AZURE_EMAIL_FROM_ADDRESS")
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    verify_link = f"{backend_url}/verify?token={token}"

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
            "plainText": f"Welcome! Please verify your account here: {verify_link}",
            "html": f"""
                <html>
                    <body>
                        <h1>Welcome!</h1>
                        <p>Please <a href="{verify_link}">click here</a> to verify your account.</p>
                    </body>
                </html>
            """
        }
    }

    try:
        client.begin_send(message)
        print(f"Email sent to {user_email}")

    except Exception as ex:
        print(f"Failed to send email: {ex}")
        raise