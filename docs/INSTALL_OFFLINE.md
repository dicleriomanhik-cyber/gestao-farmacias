# Instalação e Operação Local — Sistema de Gestão de Farmácias

Este documento explica como instalar e operar o sistema no modelo **offline-first** (servidor local na farmácia).

## 1. Requisitos Mínimos
- **Windows 10/11** (64-bit)
- **Node.js** versão 20 ou superior (recomendado v22)
- **PostgreSQL** versão 16
- **PowerShell** (incluído no Windows)

## 2. Preparação do PostgreSQL
1. Certifique-se de que o serviço do PostgreSQL está a correr.
2. Crie a base de dados `farmacia_db` e o utilizador `farmacia_user` (ou utilize o seu utilizador `postgres`).
3. Anote a password para configurar o `.env`.

## 3. Configuração do Ambiente (`.env`)
Na pasta `backend/`, crie um ficheiro `.env` baseado no `.env.example`.
**Atenção:** Nunca partilhe este ficheiro, ele contém segredos.
- `DATABASE_URL`: ex: `postgresql://farmacia_user:password@localhost:5432/farmacia_db?schema=public`
- `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`: Use strings aleatórias longas (mínimo 32 caracteres).
- `FRONTEND_DIST_PATH`: Deixe como `frontend/dist` (ou ajuste para onde o build do front-end foi gerado).

## 4. Instalação e Build (Apenas na primeira vez)
Abra o terminal na raiz do projecto (`E:\Programação\Farmacia`):

**Back-end:**
```powershell
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
```

**Front-end:**
```powershell
cd ..\frontend-fe\frontend
npm install
npm run build
```

## 5. Iniciar o Sistema
Na raiz do projecto, clique com o botão direito em `start-farmacia.ps1` e escolha **"Executar com PowerShell"**, ou no terminal:
```powershell
.\start-farmacia.ps1
```
O script irá verificar tudo e iniciar o servidor. **Mantenha a janela aberta.**

## 6. Acesso
- **Neste computador:** Abra o navegador em `http://localhost:3000`
- **Noutros computadores na mesma rede:** Descubra o IP (ex: `192.168.1.100`) e abra `http://192.168.1.100:3000`. *Nota: Pode ser necessário permitir o Node.js na firewall do Windows.*

## 7. Parar o Sistema
Na janela onde o script está a correr, prima `Ctrl+C`. Depois prima `ENTER` para fechar a janela.

## 8. Diagnóstico Rápido
- **"Porta 3000 já em uso"**: Já existe um sistema aberto. Feche a outra janela e tente novamente.
- **"PostgreSQL inacessível"**: Vá a "Serviços" do Windows e inicie o `postgresql-x64-16`.
- **"Build do Front-end não encontrado"**: O sistema abre, mas sem interface. Corra o passo 4 (Front-end).
