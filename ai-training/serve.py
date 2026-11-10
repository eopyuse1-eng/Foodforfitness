import os
from pathlib import Path

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
from protocol import parse_generated_json

BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
ADAPTER_PATH = Path(os.environ.get("NUTRIBOT_ADAPTER_PATH", "nutribot-adapter"))
SYSTEM_PROMPT = (
    "You are NutriBot, a cautious Filipino nutrition education assistant. "
    "Use clear Filipino, Taglish, or English matching the user. Give general food "
    "education, not diagnosis or treatment. Do not invent exact nutrient values. "
    "For emergencies, medication changes, individualized disease restrictions, "
    "set needs_fallback to true. For unrelated questions, do not answer the unrelated "
    "request; briefly redirect to nutrition and offer a general dietary suggestion. "
    "Return only valid "
    'JSON with keys "answer" (string) and "needs_fallback" (boolean).'
)

if not ADAPTER_PATH.exists():
    raise RuntimeError(
        f"Trained adapter not found at {ADAPTER_PATH}. Run train.py first and set NUTRIBOT_ADAPTER_PATH."
    )

tokenizer = AutoTokenizer.from_pretrained(ADAPTER_PATH)
dtype = torch.float16 if torch.cuda.is_available() else torch.float32
base = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=dtype,
    device_map="auto",
)
model = PeftModel.from_pretrained(base, ADAPTER_PATH).eval()
app = FastAPI(title="FoodForFitness Trained NutriBot")

origins = [
    origin.strip()
    for origin in os.environ.get(
        "NUTRIBOT_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


class Message(BaseModel):
    role: str
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=12)
    system_instruction: str | None = Field(default=None, max_length=4000)


@app.get("/health")
def health():
    return {"status": "ok", "model": BASE_MODEL, "adapter_loaded": True}


@app.post("/chat")
def chat(request: ChatRequest):
    system_prompt = SYSTEM_PROMPT
    if request.system_instruction:
        system_prompt = f"{SYSTEM_PROMPT}\n\nApp and user profile instructions:\n{request.system_instruction}"
    messages = [{"role": "system", "content": system_prompt}]
    for message in request.messages:
        if message.role not in {"user", "assistant"}:
            raise HTTPException(status_code=400, detail="Unsupported message role.")
        messages.append({"role": message.role, "content": message.content})

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1536)
    inputs = {key: value.to(model.device) for key, value in inputs.items()}
    with torch.inference_mode():
        output = model.generate(
            **inputs,
            max_new_tokens=220,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )
    generated = tokenizer.decode(
        output[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True,
    )
    result = parse_generated_json(generated)
    return result or {"answer": "", "needs_fallback": True}
