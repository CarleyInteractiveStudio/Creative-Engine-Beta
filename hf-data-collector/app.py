from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import time
from datetime import datetime

app = FastAPI()

# Enable CORS for the editor
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory to store collected datasets (simulating HF Dataset storage)
DATA_DIR = "/app/data"
os.makedirs(DATA_DIR, exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Creative Engine Data Collector is running"}

@app.post("/collect")
async def collect_data(request: Request):
    try:
        data = await request.json()

        # We expect: { "scripts": [...], "metadata": { "engineVersion": "0.1.2", ... } }
        timestamp = int(time.time())
        filename = f"ces_collection_{timestamp}.json"
        filepath = os.path.join(DATA_DIR, filename)

        # Save to local disk
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # Optional: Push to Hugging Face Hub if token is present
        hf_token = os.environ.get("HF_TOKEN")
        dataset_repo = "Carley1234/DatosdeentrenamientodeCreativeCode"

        if hf_token:
            try:
                from huggingface_hub import HfApi
                api = HfApi()
                api.upload_file(
                    path_or_fileobj=filepath,
                    path_in_repo=f"data/{filename}",
                    repo_id=dataset_repo,
                    repo_type="dataset",
                    token=hf_token
                )
                print(f"Successfully pushed {filename} to {dataset_repo}")
            except Exception as hf_err:
                print(f"Failed to push to HF Hub: {hf_err}")

        print(f"Collected data from engine version {data.get('metadata', {}).get('engineVersion')}")

        return {"status": "success", "file": filename}
    except Exception as e:
        print(f"Error collecting data: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
