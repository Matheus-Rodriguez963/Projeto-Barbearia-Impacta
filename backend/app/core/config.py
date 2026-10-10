"""Configurações do projeto — tudo que muda de máquina pra máquina fica aqui."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    # o pydantic-settings lê essas variáveis do arquivo .env sozinho
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # deixei um valor padrão igual ao do docker-compose pra rodar mesmo sem .env
    DATABASE_URL: str = "postgresql+psycopg://barbearia:barbearia@localhost:5432/barbearia"
    TEST_DATABASE_URL: str = "postgresql+psycopg://barbearia:barbearia@localhost:5432/barbearia_teste"

    # endereços do front que podem chamar a API (senão o navegador bloqueia por CORS)
    CORS_ORIGINS: str = "http://localhost:3020,http://127.0.0.1:3020"

    @property
    def origens_liberadas(self) -> list[str]:
        # no .env fica tudo numa linha separado por vírgula, aqui viro lista
        return [origem.strip() for origem in self.CORS_ORIGINS.split(",") if origem.strip()]


config = Config()
