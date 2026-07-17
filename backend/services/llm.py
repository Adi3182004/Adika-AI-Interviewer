import os
import requests
import json

MODEL = "google/gemini-3-flash-preview"

def get_api_key():
    return os.getenv("ADIKA_API_KEY") or os.getenv("LOVABLE_API_KEY") or ""

def call_gemini_gateway(prompt: str, json_schema: dict = None) -> dict or str or None:
    key = get_api_key()
    if not key:
        return None

    headers = {
        "Content-Type": "application/json",
        "Lovable-API-Key": key
    }
    
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}]
    }

    if json_schema:
        payload["response_format"] = {
            "type": "json_schema",
            "json_schema": json_schema
        }
    else:
        payload["response_format"] = {"type": "json_object"}

    try:
        res = requests.post(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        if not res.ok:
            print(f"Lovable Gateway error [{res.status_code}]: {res.text}")
            return None
        
        data = res.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        if json_schema:
            try:
                return json.loads(content)
            except Exception:
                return content
        return content
    except Exception as e:
        print(f"Error calling Lovable Gateway: {e}")
        return None
