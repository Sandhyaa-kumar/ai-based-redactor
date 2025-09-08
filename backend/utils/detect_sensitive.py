import re
import spacy

nlp = spacy.load("en_core_web_sm")

def detect_sensitive(text):
    # Detect emails
    emails = re.findall(r'\b[\w.-]+?@\w+?\.\w+?\b', text)
    # Detect phone numbers (10 digits)
    phones = re.findall(r'\b\d{10}\b', text)
    # Detect person names using NLP
    doc = nlp(text)
    names = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
    
    # Combine all sensitive info
    return emails + phones + names
