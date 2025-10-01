import sys
import json
import pandas as pd
import numpy as np

def anonymize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Replace sensitive-looking columns with anonymized data.
    - Emails: replace with '***@***.com'
    - Numeric strings of length >=10: mask with Xs
    - Names (capitalized words): replace with 'Anonymous'
    """
    for col in df.columns:
        # If dtype is object, attempt string anonymization
        if df[col].dtype == object:
            df[col] = df[col].astype(str).apply(anonymize_text)
    return df

def anonymize_text(text: str) -> str:
    # Email pattern
    import re
    text = re.sub(r'\b[\w\.-]+@[\w\.-]+\.\w+\b', '***@***.com', text)
    # Numeric IDs (e.g., phone, account numbers)
    text = re.sub(r'\b\d{10,}\b', 'X' * 10, text)
    # Names (simple: two capitalized words)
    text = re.sub(r'\b[A-Z][a-z]+\s[A-Z][a-z]+\b', 'Anonymous', text)
    return text

def main():
    # Read raw input from stdin
    raw = sys.stdin.read()
    try:
        # Detect JSON vs CSV
        if raw.lstrip().startswith('{') or raw.lstrip().startswith('['):
            data = json.loads(raw)
            # Convert JSON list/dict to DataFrame
            df = pd.json_normalize(data)
            df = anonymize_dataframe(df)
            # Output JSON
            print(df.to_json(orient='records', lines=False))
        else:
            # Read CSV
            df = pd.read_csv(sys.stdin)
            df = anonymize_dataframe(df)
            # Write CSV to stdout
            df.to_csv(sys.stdout, index=False)
    except Exception as e:
        # Write error to stderr and exit non-zero
        sys.stderr.write(f"Processing error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
