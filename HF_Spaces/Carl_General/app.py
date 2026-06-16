import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import os

app = FastAPI()

# Configurar CORS para permitir peticiones desde el motor
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model_name = "Qwen/Qwen2.5-1.5B-Instruct"
print(f"Cargando modelo {model_name}...")

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype="auto",
    device_map="auto"
)

lock = asyncio.Lock()

@app.get("/")
async def root():
    return {"message": "Carl General API está activa"}

@app.post("/generate")
async def generate(request: Request):
    # Si el bloqueo ya está activo, avisamos que estamos ocupados
    if lock.locked():
        return {
            "status": "busy",
            "message": "espera Carl te atendera en seguida no pierdas la paciencia"
        }

    async with lock:
        try:
            data = await request.json()
            prompt = data.get("prompt", "")
            system_prompt = data.get("system_prompt", "Eres Carl, un asistente servicial.")
            history = data.get("history", [])

            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})
            messages.append({"role": "user", "content": prompt})

            text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

            generated_ids = model.generate(
                **model_inputs,
                max_new_tokens=512,
                do_sample=True,
                temperature=0.7
            )
            generated_ids = [
                output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
            ]

            response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]

            return {"status": "success", "text": response}
        except Exception as e:
            return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
