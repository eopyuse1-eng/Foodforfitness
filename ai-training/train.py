import json
import os
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)

BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
SYSTEM_PROMPT = (
    "You are NutriBot, a cautious Filipino nutrition education assistant. "
    "Use clear Filipino, Taglish, or English matching the user. Give general food "
    "education, not diagnosis or treatment. Do not invent exact nutrient values. "
    "For emergencies, medication changes, individualized disease restrictions, "
    "or questions outside nutrition, set needs_fallback to true. Return only valid "
    'JSON with keys "answer" (string) and "needs_fallback" (boolean).'
)
ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = Path(os.environ.get("NUTRIBOT_OUTPUT_DIR", "/content/nutribot-adapter"))
MAX_LENGTH = 768


def load_examples(path):
    examples = []
    with path.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            if not line.strip():
                continue
            try:
                example = json.loads(line)
                messages = example["messages"]
                if len(messages) != 2 or messages[0]["role"] != "user" or messages[1]["role"] != "assistant":
                    raise ValueError("expected exactly one user and one assistant message")
                json.loads(messages[1]["content"])
            except (KeyError, TypeError, json.JSONDecodeError, ValueError) as error:
                raise ValueError(f"Invalid training row at {path.name}:{line_number}: {error}") from error
            examples.append(messages)
    if not examples:
        raise ValueError(f"No examples found in {path}")
    return examples


def tokenize_examples(tokenizer, examples):
    tokenized = []
    for example in examples:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}, *example]
        tokenized.append(
            tokenizer.apply_chat_template(
                messages,
                tokenize=True,
                add_generation_prompt=False,
                truncation=True,
                max_length=MAX_LENGTH,
            )
        )

    class ChatDataset(torch.utils.data.Dataset):
        def __len__(self):
            return len(tokenized)

        def __getitem__(self, index):
            return {"input_ids": tokenized[index], "attention_mask": [1] * len(tokenized[index])}

    return ChatDataset()


def main():
    if not torch.cuda.is_available():
        raise RuntimeError("Run this training script in a GPU-enabled Google Colab runtime.")

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    tokenizer.pad_token = tokenizer.eos_token
    quantization = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=quantization,
        device_map="auto",
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)
    model = get_peft_model(
        model,
        LoraConfig(
            r=8,
            lora_alpha=16,
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        ),
    )
    model.print_trainable_parameters()

    train_dataset = tokenize_examples(tokenizer, load_examples(ROOT / "nutrition_qa.jsonl"))
    eval_dataset = tokenize_examples(tokenizer, load_examples(ROOT / "evaluation.jsonl"))
    training_args = TrainingArguments(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=5,
        per_device_train_batch_size=1,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        fp16=True,
        gradient_checkpointing=True,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        logging_steps=2,
        save_total_limit=2,
        report_to="none",
        optim="paged_adamw_8bit",
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    )
    trainer.train()
    trainer.evaluate()
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"Saved LoRA adapter and tokenizer to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
