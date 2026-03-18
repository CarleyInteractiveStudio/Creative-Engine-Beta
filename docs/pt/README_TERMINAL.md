# 🖥️ Guia do Terminal - Creative Engine

A Terminal é uma ferramenta avançada que permite interagir com o motor através de comandos de texto. É ideal para gerir ficheiros rapidamente ou manipular objetos da cena sem usar o rato.

---

## 🚀 Como Ativar a Terminal

Existem duas formas de abrir a terminal no editor:
1. **Menu Superior:** Vá a **Janela > Terminal**.
2. **Aba Inferior:** No painel de Assets/Consola, clique na aba **Terminal**.

---

## 📂 1. Comandos de Sistema de Ficheiros

Estes comandos permitem navegar pelas pastas do seu projeto:

- `ls`: Lista todos os ficheiros e pastas no diretório atual.
- `cd <pasta>`: Entra numa pasta. Use `cd ..` para subir de nível ou `cd ~` para voltar à raiz.
- `pwd`: Mostra a rota atual em que se encontra.
- `cat <ficheiro>`: Mostra o conteúdo de um ficheiro de texto ou script no ecrã.
- `clear`: Limpa todo o histórico da terminal.

---

## 🎬 2. Comandos de Cena (Manipulação de Objetos)

Pode criar e modificar objetos (Matérias) diretamente daqui:

- `lsobj`: Mostra uma lista de todos os objetos na cena atual com os seus IDs.
- `mkobj <nombre>`: Cria uma nova Matéria vazia com o nome indicado.
- `rmobj <id>`: Elimina o objeto com o ID especificado.
- `inspect <id>`: Mostra detalhes técnicos, componentes e propriedades do objeto.
- `addcomp <id> <tipo>`: Adiciona um componente ao objeto.
  - *Exemplo:* `addcomp 102 Rigidbody2D`
- `setprop <id> <componente> <propriedade> <valor>`: Altera o valor de uma propriedade.
  - *Exemplo:* `setprop 102 Transform position.x 500`

---

## 🌐 3. Comandos de Utilidade

- `download <url> [ruta]`: Descarrega um ficheiro da Internet diretamente para o seu projeto.
- `help`: Mostra a lista de todos os comandos disponíveis.
- `version`: Mostra a versão atual do Creative Engine.
