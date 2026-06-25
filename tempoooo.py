# import os
# from google import genai


# def get_gemini_key():
#     return (
#         os.getenv("Google_AI_Studio")
#         or os.getenv("GOOGLE_API_KEY")
#         or ""
#     ).strip()


# def main():
#     gemini_key = get_gemini_key()

#     if not gemini_key:
#         raise ValueError(
#             "No API key found. Set Google_AI_Studio or GOOGLE_API_KEY."
#         )

#     client = genai.Client(api_key=gemini_key)

#     print("Available text-generation models:\n")

#     for model in client.models.list():
#         # Filter for models that support generateContent
#         supported = getattr(model, "supported_actions", None)

#         if supported and "generateContent" in supported:
#             print(f"{model.name}")

#             if getattr(model, "display_name", None):
#                 print(f"  Display Name: {model.display_name}")

#             if getattr(model, "description", None):
#                 print(f"  Description : {model.description}")

#             print()


# if __name__ == "__main__":
#     main()



import smtplib
from email.message import EmailMessage
import os

EMAIL = os.getenv("EMAIL")
PASSWORD = os.getenv("EMAIL_PASS")

msg = EmailMessage()
msg["Subject"] = "Test Email"
msg["From"] = EMAIL
msg["To"] = "aniket.sandye@gmail.com"

msg.set_content("Hello from Python!")

with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
    try:
        smtp.login(EMAIL, PASSWORD)
        smtp.send_message(msg)
        print("Email sent!")
    except Exception as e:
        print(e)


print("Email sent!")