import re
import spacy
from rapidfuzz import fuzz
from typing import List, Dict, Any, Tuple

# --- Configuration and Initialization ---

# Load NER model (Prefer 'trf' for better accuracy, fallback to 'sm')
try:
    nlp = spacy.load("en_core_web_trf")
except Exception:
    # Fallback to a smaller, faster model if the larger one fails to load
    print("Warning: 'en_core_web_trf' failed to load. Falling back to 'en_core_web_sm'.")
    nlp = spacy.load("en_core_web_sm")

# Refined and extended Regex patterns for sensitive info
patterns_types: List[Tuple[str, str]] = [
    (r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "EMAIL"), # Standard Email
    (r"(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4})", "PHONE"), # Common Phone formats (US/International)
    (r"\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b\d{2}[-/]\d{2}[-/]\d{4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b", "DOB"), # DOB formats
    (r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b", "SSN"), # Social Security Number (US)
    (r"\b[A-Z]{1,2}\d{7,10}\b", "PASSPORT_ID"), # Generic Passport/ID
    (r"\b[A-Z]{1}\d{3}-\d{3}-\d{3}\b", "LICENSE_NUM"), # General License/ID Format
    (r"\b\d{10,18}\b", "BANK_ACCOUNT_NUM"), # Bank Account Numbers
    (r"\b\d{9}\b", "ROUTING_NUM"), # Routing Number
    (r"\b(?:Visa|Mastercard|Amex|Discover)[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "CREDIT_CARD"), # Basic Credit Card
    (r"\bCVV[:\s]*\d{3,4}\b", "CVV"), # CVV
    # Added back your custom patterns, slightly refined for robustness
    (r"\bREF[A-Z0-9]{4,}[-\s]?[A-Z]{2}[-\s]?\d{3,}\b", "REFERENCE_ID"), 
    (r"\bSN[-\s]?\w{5,}\b", "SERIAL_NUM"), 
]

# Common words/headers to exclude from NER PERSON/ORG/GPE redaction
HEADERS_TO_SKIP = {
    # Resume Headers/Sections (do not redact these as ORG/GPE/etc.)
    "objective", "education", "skills", "projects", "certification", 
    "gpa", "experience", "summary", "profile", "confidential", 
    "date", "to", "from", "re:", "subject", "attn", "attention",
    "skills", "projects", "education", "experience", "objective", 
    "certifications", "summary", "profile", "references",

    # ADDED: Technical/Acronyms often misclassified
    "java", "c", "css", "javascript", "git", "sql", "ai", "ml", 
    "nlp", "ner", "jdbc", "html", "api", "crm", "cli",
    # Common words/phrases often caught incorrectly as ORG or GPE
    "inc", "ltd", "corporation", "co", "company", "university", 
    "college", "institute", "school", "city", "state", "global", 
    "international", "department", "team", "group", "product", "software",
    
    # Common job titles (often caught as ORG/PERSON)
    "manager", "developer", "engineer", "analyst", "specialist", 
    "consultant", "director", "coordinator", "assistant", "lead", 
    "associate", "officer", "president", "ceo", "cto", "cfo"
}

# --- Utility Function ---

def smart_block_match(entity_text: str, blocks: List[Dict[str, Any]]) -> Dict[str, Any] | None:
    """
    Finds the best matching block for a detected entity using fuzzy string matching 
    to link text to its bounding box (coordinates).
    """
    entity_text_lower = entity_text.lower()
    best_block = None
    highest_score = 0
    
    for block in blocks:
        block_text_lower = block.get("text", "").lower()
        if not block_text_lower:
            continue
            
        # Prioritize perfect containment
        if entity_text_lower in block_text_lower:
            score = 100 
        else:
            # Use partial ratio for better matching of fragments/OCR errors
            score = fuzz.partial_ratio(entity_text_lower, block_text_lower)
            
        if score > highest_score:
            highest_score = score
            best_block = block
            
    # Use a slightly strict threshold (85) to ensure high confidence match
    return best_block if highest_score >= 85 else None

# --- Main Detection Function (Resume-Aware) ---

def get_redaction_suggestions(pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Detects sensitive entities using NER and Regex. Includes contextual filtering 
    to prevent accidental redaction of non-PII in resumes (e.g., company names).
    
    :param pages: List of dictionaries, each containing page number, text, and blocks.
    :return: List of redaction suggestion dictionaries.
    """
    suggestions: List[Dict[str, Any]] = []
    
    # Define strong headers for contextual filtering
    STRONG_RESUME_HEADERS = {"experience", "education", "projects", "skills"}
    
    for page_data in pages:
        page_num = page_data["page"]
        text = page_data["text"]
        block_list = page_data.get("blocks", [])

        doc = nlp(text)
        detected_entities = []

        # 1. NER-based entities (PERSON, ORG, GPE, LOC)
        for ent in doc.ents:
            ent_text_stripped = ent.text.strip()
            ent_text_lower = ent_text_stripped.lower()

            # Filter 1: Skip very short entities or predefined common/header terms
            if len(ent_text_stripped) <= 2 or ent_text_lower in HEADERS_TO_SKIP:
                continue
                
            # Filter 2: CONTEXTUAL FILTER (Crucial for Resumes/General Documents)
            # Check the text context *before* the entity for strong header indicators.
            start_index = ent.start_char
            # Check the 50 characters preceding the entity
            context_before = text[max(0, start_index - 50): start_index].lower()
            
            if ent.label_ in {"ORG", "GPE", "LOC", "NORP"}:
                # If an ORG/GPE/LOC is found immediately following an 'Experience' or 'Education' header,
                # it's likely a non-sensitive company or university name, so we skip redaction.
                if any(header in context_before for header in STRONG_RESUME_HEADERS):
                    continue
            
            # Entities remaining (e.g., applicant's name, sensitive addresses, or other PII not near headers)
            if ent.label_ in {"PERSON", "ORG", "GPE", "LOC", "NORP"}:
                detected_entities.append({"entity": ent_text_stripped, "type": ent.label_})

        # 2. Regex pattern matches (High-confidence PII)
        for patt, typ in patterns_types:
            for match in re.finditer(patt, text):
                entity_value = match.group().strip()
                # Simple check to avoid duplicates with NER-caught entities
                if not any(d["entity"] == entity_value for d in detected_entities):
                     detected_entities.append({"entity": entity_value, "type": typ})


        # 3. Match entities to block coordinates
        for entity_data in detected_entities:
            entity_value = entity_data["entity"]
            entity_type = entity_data["type"]
            
            # Find the best block match for the entity
            block = smart_block_match(entity_value, block_list)
            
            if block:
                # Add suggestion if a block is successfully matched
                suggestions.append({
                    "type": entity_type,
                    "entity": entity_value,
                    "page": page_num,
                    "x": block["x"],
                    "y": block["y"],
                    "width": block["width"],
                    "height": block["height"],
                    "suggested_redaction": "rectangle"
                })

    return suggestions

# If you were to run this, you would call:
# suggestions = get_redaction_suggestions_resume_aware(your_pdf_data_structure)