# 📚 Guia de Bibliotecas e Extensibilidade - Creative Engine

As bibliotecas no Creative Engine (ficheiros `.celib`) permitem estender tanto a interface do editor quanto as capacidades de programação dos seus jogos.

---

## 🛠️ 1. Bibliotecas de Interface (Ferramentas do Editor)

Pode criar as suas próprias janelas e ferramentas personalizadas para o editor usando `CreativeEngine.API`.

### Registo de uma Janela
Para que a sua ferramenta apareça no menu **Janela**, use:

```javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "A Minha Super Ferramenta",
        estilo: "moderno", // "carl", "moderno" ou vazio
        ancho: 400,
        alto: 300,
        alAbrir: function(panel) {
            panel.texto("Bem-vindo à minha ferramenta!", { negrita: true, color: "#3498db" });

            panel.fila((f) => {
                f.boton("Saudar", () => alert("Olá!"));
                f.boton("Fechar", () => panel.elemento.remove());
            });

            panel.separador();

            panel.input("O Teu Nome", (valor) => {
                console.log("Nome inserido: " + valor);
            });
        }
    });
})();
```

### Componentes de UI Disponíveis
O objeto `panel` passado a `alAbrir` tem os seguintes métodos:
- `texto(contenido, opciones)`
- `boton(etiqueta, clickCallback, opciones)`
- `input(etiqueta, opcionesOrCallback)`
- `numero(etiqueta, opcionesOrCallback)`
- `checkbox(etiqueta, inicial, alCambiar)`
- `slider(etiqueta, opciones)`
- `desplegable(etiqueta, items, opciones)`
- `imagen(src, opciones)`
- `fila(callback)` / `columna(callback)`: Para organizar elementos.

---

## 🎮 2. Bibliotecas de Runtime (Novas Funcões para Scripts)

Se quiser adicionar novas funções que possam ser usadas dentro dos seus scripts `.ces`, deve registar uma API de runtime.

### Exemplo: Biblioteca de Matemática Avançada
Crie um ficheiro JS e registe-o assim:

```javascript
(function() {
    const AMinhaCalculadora = {
        sumar: (a, b) => a + b,
        alCuadrado: (n) => n * n,
        generarID: () => "ID_" + Math.random().toString(36).substr(2, 9)
    };

    // Isto fará com que "AMinhaCalculadora" esteja disponível nos scripts .ces
    CreativeEngine.API.registrarRuntimeAPI("AMinhaCalculadora", AMinhaCalculadora);
})();
```

### Como usá-la num Script (.ces)
Use a palavra-chave `go` ou `ve` seguida do nome da biblioteca:

```ces
ve motor;
go "AMinhaCalculadora"; // Importamos a biblioteca

alEmpezar() {
    variable resultado = sumar(10, 5); // As funções da lib são globais agora
    imprimir("Resultado: " + resultado);
    imprimir("O meu ID é: " + generarID());
}
```

---

## 💡 Exemplos Completos

### 🛠️ Ferramenta: Gerador de Nomes Aleatórios
```javascript
(function() {
    const nombres = ["Rex", "Luna", "Titan", "Zelda", "Mario"];

    CreativeEngine.API.registrarVentana({
        nombre: "Gerador de NPC",
        alAbrir: function(ui) {
            ui.texto("Gera um nome para o teu novo objeto:");

            const display = ui.texto("---", { bold: true, tamano: "20px" });

            ui.boton("Gerar!", () => {
                const nombre = nombres[Math.floor(Math.random() * nombres.length)];
                display.textContent = nombre;

                // Se houver um objeto selecionado, mudamos-lhe o nome
                if (window.selectedMateria) {
                    window.selectedMateria.name = nombre;
                    window.updateHierarchy();
                }
            });
        }
    });
})();
```

---

## 📦 Como Criar e Instalar uma Biblioteca
1. Crie um ficheiro com extensão `.js`.
2. Escreva o seu código de extensão (UI ou Runtime).
3. No editor, arraste o ficheiro `.js` para o **Navegador de Assets**.
4. O motor detetará a biblioteca e movê-la-á automaticamente para a pasta `/lib`.
5. Abra o painel de **Bibliotecas** (Menu superior) para ativá-la.
6. **Reinicie o editor** para que as alterações surtam efeito.
