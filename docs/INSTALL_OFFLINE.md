# InstalaÁ„o e OperaÁ„o Local ó Sistema de Gest„o de Farm·cias

Este documento explica como instalar e operar o sistema no modelo **offline-first** (servidor local na farm·cia).

## 1. Requisitos MÌnimos
- **Windows 10/11** (64-bit)
- **Node.js** vers„o 20 ou superior (recomendado v22)
- **PostgreSQL** vers„o 16
- **PowerShell** (incluÌdo no Windows)

## 2. PreparaÁ„o do PostgreSQL
1. Certifique-se de que o serviÁo do PostgreSQL est· a correr.
2. Crie a base de dados `farmacia_db` e o utilizador `farmacia_user` (ou utilize o seu utilizador `postgres`).
3. Anote a password para configurar o `.env`.

## 3. ConfiguraÁ„o do Ambiente (`.env`)
Na pasta `backend/`, crie um ficheiro `.env` baseado no `.env.example`.
**AtenÁ„o:** Nunca partilhe este ficheiro, ele contÈm segredos.
- `DATABASE_URL`: ex: `postgresql://farmacia_user:password@localhost:5432/farmacia_db?schema=public`
- `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`: Use strings aleatÛrias longas (mÌnimo 32 caracteres).
- `FRONTEND_DIST_PATH`: Deixe como `frontend/dist` (ou ajuste para onde o build do front-end foi gerado).

## 4. InstalaÁ„o e Build (Apenas na primeira vez)
Abra o terminal na raiz do projecto (`E:\ProgramaÁ„o\Farmacia`):

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
Na raiz do projecto, clique com o bot„o direito em `start-farmacia.ps1` e escolha **"Executar com PowerShell"**, ou no terminal:
```powershell
.\start-farmacia.ps1
```
O script ir· verificar tudo e iniciar o servidor. **Mantenha a janela aberta.**

## 6. Acesso
- **Neste computador:** Abra o navegador em `http://localhost:3000`
- **Noutros computadores na mesma rede:** Descubra o IP (ex: `192.168.1.100`) e abra `http://192.168.1.100:3000`. *Nota: Pode ser necess·rio permitir o Node.js na firewall do Windows.*

## 7. Parar o Sistema
Na janela onde o script est· a correr, prima `Ctrl+C`. Depois prima `ENTER` para fechar a janela.

## 8. DiagnÛstico R·pido
- **"Porta 3000 j· em uso"**: J· existe um sistema aberto. Feche a outra janela e tente novamente.
- **"PostgreSQL inacessÌvel"**: V· a "ServiÁos" do Windows e inicie o `postgresql-x64-16`.
- **"Build do Front-end n„o encontrado"**: O sistema abre, mas sem interface. Corra o passo 4 (Front-end).

## 9. Backups e Recupera√ß√£o

### Backup manual
Para criar um backup imediato da base de dados:
```powershell
.\backup-farmacia.ps1
```
O ficheiro ser√° guardado em `E:\FarmaciaBackups\` com o formato `farmacia_db_AAAAMMDD_HHMMSS.dump`.

### Agendamento autom√°tico (di√°rio √†s 20h00)
1. Abra o **Agendador de Tarefas** do Windows.
2. Clique em **Criar Tarefa** (n√£o "Tarefa B√°sica").
3. No separador **Geral**:
   - Nome: `Backup Farmacia`
   - Executar mesmo que o utilizador n√£o tenha sess√£o iniciada: **Sim**
   - Executar com privil√©gios mais altos: **Sim**
4. No separador **Ac√ß√µes** ‚Üí **Nova**:
   - Programa: `powershell.exe`
   - Argumentos: `-NoProfile -ExecutionPolicy Bypass -File "E:\Programa√ß√£o\Farmacia\backup-farmacia.ps1" -Force`
   - Iniciar em: `E:\Programa√ß√£o\Farmacia`
5. No separador **Disparadores** ‚Üí **Novo**:
   - Diariamente, √†s 20:00.
6. Guardar e testar: clique com o bot√£o direito na tarefa ‚Üí **Executar**.

### C√≥pia externa (recomendado)
Um backup guardado no mesmo disco n√£o protege contra falha f√≠sica do disco.
Copie os backups para um disco externo ou pen drive regularmente (ex: semanalmente):
```powershell
# C√≥pia incremental (n√£o apaga nada no destino)
robocopy "E:\FarmaciaBackups" "F:\BackupFarmacia" *.dump /E /XO /R:2 /W:5
```
*Nota: `/XO` copia apenas ficheiros mais recentes. N√£o apaga backups antigos do destino.*

### Reten√ß√£o
O script apaga automaticamente backups com mais de 30 dias. Este valor pode ser alterado no ficheiro `backend/.env` na vari√°vel `RETENTION_DAYS`.
Quando executado manualmente (sem `-Force`), o script pede confirma√ß√£o antes de apagar.

### Restauro de emerg√™ncia (testado)
Para recuperar a base de dados num caso de falha:
1. Pare o servidor (`Ctrl+C` no terminal).
2. Apague a base de dados corrompida (apenas se necess√°rio e se tiver a certeza):
   ```powershell
   psql -h localhost -U postgres -c "DROP DATABASE farmacia_db;"
   psql -h localhost -U postgres -c "CREATE DATABASE farmacia_db;"
   ```
3. Restaure o √∫ltimo backup:
   ```powershell
   pg_restore -h localhost -U postgres -d farmacia_db --no-owner --no-privileges "E:\FarmaciaBackups\farmacia_db_AAAAMMDD_HHMMSS.dump"
   ```
4. Reinicie o servidor (`.\start-farmacia.ps1`).
5. Confirme que os dados voltaram: `http://localhost:3000`.

### Aviso final
**Um backup s√≥ √© v√°lido depois de ser restaurado com sucesso.** Este procedimento foi testado e validado (ver relat√≥rio BE-14B.45).
