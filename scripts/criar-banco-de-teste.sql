-- Banco separado só pro pytest, pra ele não apagar os dados do banco de verdade.
CREATE DATABASE barbearia_teste;
GRANT ALL PRIVILEGES ON DATABASE barbearia_teste TO barbearia;
