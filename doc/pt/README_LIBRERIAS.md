# 📚 O Livro da Extensibilidade: Livrarias e Ferramentas (.celib) — Creative Engine

Bem-vindo ao nível avançado, Arquiteto! Se estás aqui, é porque não queres apenas criar jogos, mas queres também **criar as ferramentas que outros usarão** ou potenciar o motor com funções únicas.

No **Creative Engine**, o sistema de livrarias (.celib) permite-te injetar JavaScript puro diretamente no editor ou no coração do jogo. Este guia ensinar-te-á a expandir os limites do que é possível.

---

## 📖 Tabela de Conteúdos

1. [Capítulo 1: O Poder da Extensibilidade](#capítulo-1-o-poder-da-extensibilidade)
2. [Capítulo 2: Anatomia de uma Livraria (.celib)](#capítulo-2-anatomia-de-uma-livraria-celib)
3. [Capítulo 3: Criação de Ferramentas para o Editor](#capítulo-3-criação-de-ferramentas-para-o-editor)
4. [Capítulo 4: Referência API do Construtor de UI](#capítulo-4-referência-api-do-construtor-de-ui)
5. [Capítulo 5: Extensões de Runtime (Novas APIs para CES)](#capítulo-5-extensões-de-runtime-novas-apis-para-ces)
6. [Capítulo 6: Exemplo Pro - O Renomeador em Massa](#capítulo-6-exemplo-pro-o-renomeador-em-massa)
7. [Capítulo 7: Exemplo Pro - Sistema de Conquistas Global](#capítulo-7-exemplo-pro-sistema-de-conquistas-global)
8. [Capítulo 8: Instalação e Distribuição](#capítulo-8-instalação-e-distribuição)

---

## 🏛️ Capítulo 1: O Poder da Extensibilidade

Porquê usar livrarias?
- **Automação:** Cria botões que geram níveis inteiros ou configuram luzes automaticamente.
- **APIs Próprias:** Adiciona funções como `miBaseDeDatos.guardar()` que se sintam nativas em CES.
- **Personalização:** Altera o fluxo de trabalho do editor para que se adapte a ti.

Creative Engine é **"Engine-as-a-Platform"**: tu tens as chaves do reino.

---

## 🦴 Capítulo 2: Anatomia de uma Livraria (.celib)

Uma livraria é tecnicamente um ficheiro JavaScript padrão envolvido numa função autoelegível (IIFE) para evitar conflitos.

```javascript
(function() {
    // A tua lógica aqui
    console.log("A minha livraria foi carregada corretamente.");
})();
```

---

## 🛠️ Capítulo 3: Criação de Ferramentas para o Editor

Podes adicionar janelas personalizadas ao menu **Janela** do editor usando `CreativeEngine.API.registrarVentana`.

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "A Minha Ferramenta",
        ancho: 350,
        alto: 250,
        alAbrir: function(panel) {
            panel.texto("Olá a partir do código!");
            panel.boton("Premir", () => alert("Funciona!"));
        }
    });
})();
```

---

## 🍱 Capítulo 4: Referência API do Construtor de UI

O objeto `panel` que recebes em `alAbrir` é uma fábrica de interfaces dinâmica. Aqui tens tudo o que podes criar:

### Elementos Básicos:
- **`texto(conteudo, opcoes)`**: Mostra texto. Opções: `{ negrita: true, color: "#hex", tamano: "14px" }`.
- **`boton(etiqueta, clickCallback)`**: Um botão interativo.
- **`input(etiqueta, callback)`**: Campo de texto. O callback devolve o valor ao mudar.
- **`numero(etiqueta, callback)`**: Campo numérico para valores precisos.
- **`checkbox(etiqueta, valorInicial, callback)`**: Interruptor booleano.
- **`slider(etiqueta, opcoes, callback)`**: Opções: `{ min, max, passo }`.

### Organização:
- **`fila(callback)`**: Cria um contentor horizontal. Dentro do callback, usas o novo objeto de fila.
- **`columna(callback)`**: Igual à fila, mas vertical.
- **`separador()`**: Uma linha subtil para organizar visualmente.
- **`imagen(src)`**: Mostra um ícone ou preview.

---

## 🎮 Capítulo 5: Extensões de Runtime (Novas APIs para CES)

Esta é a parte mais potente: adicionar funções que os teus scripts `.ces` podem usar. Faz-se através de `CreativeEngine.API.registrarRuntimeAPI`.

**No teu ficheiro .js:**
```javascript
(function() {
    const MinhaAPI = {
        saudar: (nome) => "Olá " + nome,
        obterPontos: () => 100
    };
    CreativeEngine.API.registrarRuntimeAPI("Utilidades", MinhaAPI);
})();
```

**Uso num Script (.ces):**
```ces
ve motor;
go "Utilidades"; // Importar a extensão

alEmpezar() {
    variable msj = saudar("Jogador"); // Uso direto!
}
```

---

## 🚀 Capítulo 6: Exemplo Pro - O Renomeador em Massa

Esta ferramenta procura todos os objetos na cena e adiciona-lhes um prefixo.

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "Batch Renamer",
        alAbrir: (ui) => {
            ui.texto("Adiciona um prefixo a todos os objetos:");
            let prefijo = "OBJ_";

            ui.input("Prefixo", (v) => prefijo = v);

            ui.boton("Renomear Tudo!", () => {
                const materias = window.SceneManager.currentScene.getAllMaterias();
                materias.forEach(m => m.name = prefijo + m.name);
                window.updateHierarchy(); // Atualizar a lista visual
                alert("Renomeados " + materias.length + " objetos.");
            });
        }
    });
})();
```

---

## 🏆 Capítulo 7: Exemplo Pro - Sistema de Conquistas Global

Cria um sistema que guarde o progresso de forma persistente.

```javascript
(function() {
    const Conquistas = {
        lista: [],
        desbloquear: function(id) {
            if (!this.lista.includes(id)) {
                this.lista.push(id);
                console.log("🏆 Conquista desbloqueada: " + id);
                // Aqui poderias guardar no localStorage
            }
        }
    };
    CreativeEngine.API.registrarRuntimeAPI("Conquistas", Conquistas);
})();
```

---

## 📦 Capítulo 8: Instalação e Distribuição

1. Escreve o teu código num ficheiro `.js`.
2. Renomeia a extensão para `.celib` (opcional, o motor aceita `.js` também).
3. **Arrasta** o ficheiro para o painel de **Assets** do editor.
4. O motor moverá o ficheiro automaticamente para a pasta `/lib` do teu projeto.
5. Ativa-o a partir do menu **Livrarias**.
6. **Reinicia o editor** (ou recarrega a página) para que a injeção de código seja completa.

---
*Precisas de APIs mais profundas? Contacta a equipa de desenvolvimento para aceder ao SDK de baixo nível.*
