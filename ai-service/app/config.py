from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Central config, loaded from environment variables (or a .env file in
    dev). Keeping this in one place instead of os.environ calls
    scattered through the codebase makes the service dependencies explicit.
    """

    port: int = 8000
    database_url: str
    backend_url: str = "http://localhost:4000"
    ollama_url: str = "http://localhost:11434"
    merchant_id: str = "merch_razor_test_01"

    class Config:
        env_file = ".env"


settings = Settings()