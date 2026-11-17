


<details>
<summary>Como este projeto foi criado</summary>

```bash
# 1. Cria o projeto Python com a versão desejada
uv init Call_Firt --python 3.12
cd Call_Firt

# 2. Inicializa o Git e faz o primeiro commit
git init
git add .
git commit -m "Initial commit"

# 3. Cria o repositório público no GitHub, associa o remoto e faz o push
gh repo create Call_Firt --public --source=. --remote=origin --push

#4. cria o ambiente virtual
uv venv
```

</details>