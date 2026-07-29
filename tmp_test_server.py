import sys
sys.path.insert(0, "/app")

from fastapi import FastAPI
from app.api.router import api_router

app = FastAPI()
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=9999, log_level="info")
