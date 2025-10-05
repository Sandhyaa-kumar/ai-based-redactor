import re
import spacy
from rapidfuzz import fuzz

# Load powerful transformer-based NER
try:
    nlp = spacy.load("en_core_web_trf")  # super accurate, but requires >2GB RAM
except Exception:
    nlp = spacy.load("en_core_web_sm")   # fallback (less accurate)

# Expand regexes for more variants
email_pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
phone_pattern = r"\b(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?){1,2}\d{4}\b"  # more flexible

def smart_block_match(entity_text, blocks):
    # Use fuzzy matching for robust block/entity linking
    best_block = None
    highest_score = 0
    for block in blocks:
        score = fuzz.partial_ratio(entity_text.lower(), block["text"].lower())
        if score > highest_score:
            highest_score = score
            best_block = block
    return best_block if highest_score > 75 else None  # only accept good matches

def get_redaction_suggestions(pages):
    suggestions = []
    for page_data in pages:
        page_num = page_data["page"]
        text = page_data["text"]
        block_list = page_data.get("blocks", [])

        # Use spaCy transformer NER
        if nlp:
            doc = nlp(text)
            for ent in doc.ents:
                if ent.label_ in ["PERSON", "ORG", "GPE"]:
                    block = smart_block_match(ent.text, block_list)
                    if block:
                        suggestions.append({
                            "type": ent.label_,
                            "entity": ent.text,
                            "page": page_num,
                            "x": block["x"],
                            "y": block["y"],
                            "width": block["width"],
                            "height": block["height"],
                            "suggested_redaction": "rectangle"
                        })
        # Powerful regex
        for match in re.finditer(email_pattern, text):
            block = smart_block_match(match.group(), block_list)
            if block:
                suggestions.append({
                    "type": "EMAIL",
                    "entity": match.group(),
                    "page": page_num,
                    "x": block["x"],
                    "y": block["y"],
                    "width": block["width"],
                    "height": block["height"],
                    "suggested_redaction": "rectangle"
                })
        for match in re.finditer(phone_pattern, text):
            block = smart_block_match(match.group(), block_list)
            if block:
                suggestions.append({
                    "type": "PHONE",
                    "entity": match.group(),
                    "page": page_num,
                    "x": block["x"],
                    "y": block["y"],
                    "width": block["width"],
                    "height": block["height"],
                    "suggested_redaction": "rectangle"
                })
    return suggestions
