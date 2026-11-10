import json
import re


def parse_generated_json(text):
    candidate = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        text.strip(),
        flags=re.IGNORECASE,
    )
    try:
        result = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    if not isinstance(result, dict) or not isinstance(result.get("needs_fallback"), bool):
        return None
    if result["needs_fallback"]:
        return {"answer": "", "needs_fallback": True}
    answer = result.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        return None
    return {"answer": answer.strip(), "needs_fallback": False}
