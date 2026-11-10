# NutriBot training prototype

This prototype fine-tunes the open-weight Qwen2.5-1.5B-Instruct model with LoRA on an author-created Filipino nutrition Q&A dataset. The fine-tuned model is the first responder; the web app uses Gemini when the model explicitly requests fallback or the local model endpoint is unavailable.

This is not a model trained from scratch, a clinically validated system, or medical advice. The starter dataset is small and synthetic; it is only enough to test the training and integration workflow. Expand it with reviewed, properly attributed nutrition examples and evaluate it with a larger held-out set before making health-related claims.

The base checkpoint is distributed under Apache-2.0. Check its model card and license before redistribution. Do not put private health data, API keys, or identifiable chat logs in the training dataset.

## 1. Train in Google Colab

1. Open `NutriBot_Colab_Training.ipynb` in Google Colab. In Colab, use **File > Upload notebook** if it is on your computer.
2. Choose **Runtime > Change runtime type > T4 GPU** if one is available.
3. Run the notebook cells from top to bottom.
4. When the upload dialog appears, select `train.py`, `nutrition_qa.jsonl`, and `evaluation.jsonl` from this folder.
5. Wait for training and evaluation to finish. The last cell downloads `nutribot-adapter.zip`.
6. Keep the adapter ZIP private; do not commit model weights to the app repository.

Colab free GPU availability and session duration are not guaranteed. Training can take longer or stop if the session disconnects.

## 2. Run the local inference API

In a Python environment with a supported PyTorch install:

```powershell
python -m pip install -r ai-training/requirements.txt
$env:NUTRIBOT_ADAPTER_PATH = "C:\path\to\nutribot-adapter"
$env:NUTRIBOT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
Set-Location ai-training
python -m uvicorn serve:app --host 127.0.0.1 --port 8000
```

The API intentionally binds to loopback by default. It has no authentication and must not be exposed to the public internet or a tunnel as-is. For an in-person prototype, run the web app and API on the same computer. Public/mobile access requires a separately secured backend, authentication, rate limiting, and HTTPS.

## 3. Connect the web app

Set `VITE_NUTRIBOT_MODEL_URL=http://127.0.0.1:8000/chat` in the local `.env`, then rebuild/restart Vite. The model API receives the chat messages and the profile-aware system instruction. NutriBot is instructed to stay within nutrition, food, meal planning, and diet-related health education; unrelated questions are redirected to nutrition instead of being answered. When the local model returns `needs_fallback: true` or is unavailable, the app falls back to Gemini using the same profile-aware scope instructions.

The deployed Firebase website does not use the laptop model unless a secured, reachable HTTPS backend is configured and the website is rebuilt and redeployed. Do not deploy a temporary laptop/tunnel URL as a public backend.

## 4. Evaluate before presenting

Use the separate `evaluation.jsonl` questions as a starting point. Test in Filipino, English, and Taglish. Record whether it answers in-scope food questions, falls back for unsupported or high-risk questions, returns valid JSON, and avoids invented exact nutrition values. A low evaluation loss alone does not establish safety or answer quality.
