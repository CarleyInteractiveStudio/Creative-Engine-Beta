# 📚 O Livro da Extensibilidade: Livrarias e Ferramentas (.celib) — Creative Engine

Bem-vindo ao santuário dos desenvolvedores de ferramentas. Se chegaste até aqui, é porque não queres apenas usar o motor, queres **ser parte dele**. No Creative Engine, a extensibilidade não é uma reflexão tardia, é uma característica central.

Este livro detalha como podes injetar o teu próprio código JavaScript (ES6) para criar interfaces personalizadas ou APIs globais que vão potenciar toda a tua equipa.

---

## 📖 Tabela de Conteúdos

1. [Capítulo 1: O Ecossistema de Extensões](#capítulo-1-o-ecossistema-de-extensões)
2. [Capítulo 2: O Registo Global de APIs](#capítulo-2-o-registo-global)
3. [Capítulo 3: Construção de Interfaces de Utilizador (UI)](#capítulo-3-construção-de-ui)
4. [Capítulo 4: Referência de Widgets do Painel](#capítulo-4-referência-de-widgets)
5. [Capítulo 5: Hooks e Eventos do Motor](#capítulo-5-hooks-e-eventos)
6. [Capítulo 6: Caso de Estudo: Gerador de Níveis Procedimental](#capítulo-6-caso-de-estudo)
7. [Capítulo 7: Depuração de Livrarias](#capítulo-7-depuração)
8. [Capítulo 8: Publicação e Boas Práticas](#capítulo-8-publicação)

---

## 🏛️ Capítulo 1: O Ecossistema de Extensões

As livrarias no Creative Engine dividem-se em duas categorias principais:
1. **Livrarias de Editor:** Adicionam botões, janelas e utilidades que apenas existem enquanto estás a desenhar o jogo.
2. **Livrarias de Runtime:** Injetam funções que os scripts `.ces` podem usar durante a execução do jogo (ex: um sistema de gravação na nuvem).

Qualquer ficheiro `.js` ou `.celib` colocado na pasta `/lib` é carregado automaticamente ao iniciar o editor.

---

## 🧪 Capítulo 2: O Registo Global

A porta de entrada para tudo é o objeto `CreativeEngine.API`. Este objeto permite-te comunicar com as entranhas do motor de forma segura.

### Registo de Runtime API
Se queres que uma função esteja disponível para todos os scripts CES:

```javascript
(function() {
    const MeuSistema = {
        calcularDistancia: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
        config: { versão: "1.0" }
    };
    CreativeEngine.API.registrarRuntimeAPI("Geometria", MeuSistema);
})();
```

**Efeito:** Em qualquer script CES agora podes usar `go "Geometria";` e chamar `calcularDistancia()`.

---

## 🎨 Capítulo 3: Construção de Interfaces (UI)

O Creative Engine utiliza uma API declarativa para construir ferramentas. Não precisas de saber HTML ou CSS; o motor encarrega-se do design para que coincida com a estética do editor.

```javascript
CreativeEngine.API.registrarVentana({
    nombre: "Explorador de Dados",
    ancho: 400,
    alto: 300,
    alAbrir: function(panel) {
        panel.columna((col) => {
            col.texto("Estado do Sistema", { negrita: true });
            col.separador();
            col.boton("Atualizar", () => MinhaLogica.actualizar());
        });
    }
});
```

---

## 🍱 Capítulo 4: Referência de Widgets

### Elementos de Entrada
- **`input(etiqueta, callback)`**: Recebe uma string.
- **`numero(etiqueta, callback)`**: Filtra automaticamente para apenas permitir números.
- **`checkbox(etiqueta, inicial, callback)`**: Devolve um booleano.
- **`slider(etiqueta, opções, callback)`**: Opções: `{ min, max, paso }`.

### Elementos Visuais
- **`texto(valor, estilo)`**: Suporta `color`, `fontSize`, `bold`.
- **`imagen(url)`**: Útil para pré-visualizar sprites ou texturas.

---

## 🪝 Capítulo 5: Hooks e Eventos

A tua livraria pode reagir ao que acontece no motor.

### Eventos de Seleção
```javascript
window.addEventListener('mtrSelected', (e) => {
    const materia = e.detail; // O objeto selecionado atualmente
    console.log("Selecionado: " + materia.name);
});
```

### Eventos de Cena
- `sceneLoaded`: Quando termina de carregar um nível.
- `gameStarted` / `gameStopped`: Útil para inicializar bases de dados locais apenas durante o jogo.

---

## 🚀 Capítulo 6: Caso de Estudo - Gerador Procedimental

Imagina uma ferramenta que cria uma grelha de inimigos automaticamente:

```javascript
CreativeEngine.API.registrarVentana({
    nombre: "Spawn Master",
    alAbrir: (ui) => {
        let quantidade = 10;
        ui.numero("Quantidade", (v) => quantidade = v);
        ui.boton("Gerar!", async () => {
            for(let i=0; i<quantidade; i++) {
                const x = Math.random() * 800;
                const y = Math.random() * 600;
                await window.SceneManager.instantiatePrefabFromPath("Assets/Inimigo.ceprefab", x, y);
            }
        });
    }
});
```

---

## 🐛 Capítulo 7: Depuração de Livrarias

Dado que as livrarias são JavaScript puro, podes usar as ferramentas de desenvolvedor do navegador (F12):
1. Abre o separador **Sources**.
2. Procura o teu ficheiro na pasta `lib/`.
3. Define pontos de interrupção (breakpoints).
4. Usa `console.dir(window.CreativeEngine)` para inspecionar a API disponível.

---

## 📦 Capítulo 8: Publicação e Boas Práticas

- **Encapsulamento:** Usa sempre o padrão `(function() { ... })();` para não contaminar o espaço global.
- **Desempenho:** Não realices cálculos pesados na thread principal do editor; usa `setTimeout` ou `Worker` se necessário.

---
*Este documento é um guia vivo. Se criares uma livraria útil, partilha-a com a comunidade!*
