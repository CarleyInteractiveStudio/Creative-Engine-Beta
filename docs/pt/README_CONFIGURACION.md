# ⚙️ Guia de Configuração, Preferências e Ambiente - Creative Engine

Este guia explica como personalizar o seu fluxo de trabalho no editor e como configurar os parâmetros técnicos do seu projeto.

---

## 🛠️ 1. Configuração do Projeto

Aceda através de **Editar > Configuração do Projeto**. Estas alterações são guardadas no ficheiro `project.ceconfig`.

- **Metadados:** Altere o nome do seu jogo, a versão e o autor.
- **Ícone:** Selecione a imagem que representará o seu jogo ao exportá-lo.
- **Camadas (Layers):**
  - **Sorting Layers:** Define a ordem em que os objetos são desenhados (o que estiver mais abaixo na lista é desenhado à frente).
  - **Collision Layers:** Define quais camadas podem colidir entre si.
- **Etiquetas (Tags):** Crie etiquetas personalizadas (ex: "Inimigo", "Picos") para usá-las nos seus scripts com `estaTocandoTag()`.

---

## 🎨 2. Preferências do Editor

Aceda através de **Editar > Preferências**. Estes ajustes são pessoais e não afetam o jogo final.

- **Idioma:** Altere a interface entre Espanhol e Inglês.
- **Temas:** Escolha entre vários temas visuais (Dark, Light, Carl, etc.) ou crie o seu próprio.
- **Guardar Automático:** Ative o guardar automático dos seus scripts a cada poucos segundos.
- **Snapping:** Se o ativar, os objetos serão "atraídos" pela grelha ao movê-los. Pode definir o tamanho da quadrícula.
- **Terminal:** Ative ou desative a visibilidade do terminal de comandos.

---

## 🌗 3. Controle de Ambiente (Atmosfera)

Aceda através de **Janela > Controle de Ambiente**. Permite criar climas e ciclos de tempo na sua cena.

- **Filtro de Cor:** Altera a cor geral da cena. Use-o para criar efeitos de entardecer, noite ou filtros de cor (sépia, frio, etc.).
- **Ciclo Dia/Noite:**
  - **Ciclo Automático:** Se o ativar, o tempo avançará apenas durante o jogo.
  - **Duração do Dia:** Define quantos segundos demora a completar-se um ciclo de 24h.
- **Camadas Excluídas:** Indica quais camadas NÃO devem escurecer quando for noite (muito útil para que a Interface de Utilizador ou as Luzes se vejam sempre brilhantes).
