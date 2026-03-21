# 📔 O Livro Mestre do Scripting (CES) — Creative Engine

Bem-vindo ao auge da criação de videojogos! Este não é um simples manual do utilizador; é uma enciclopédia técnica desenhada para te tornar um arquiteto de realidades. Nas páginas seguintes, vamos detalhar cada engrenagem do **Creative Engine Script (CES)**.

---

## 📖 Tabela de Conteúdos

0. [Capítulo 0: Imersão Rápida (O teu primeiro sucesso)](#capítulo-0-imersão-rápida)
1. [Capítulo 1: Filosofia e Arquitetura do Motor](#capítulo-1-filosofia-e-arquitetura)
2. [Capítulo 2: A Linguagem CES e o Transpilador](#capítulo-2-a-linguagem-ces)
3. [Capítulo 3: O Inspetor Dinâmico e Tipagem](#capítulo-3-o-inspetor-dinâmico)
4. [Capítulo 4: O Batimento: Ciclo de Vida Profundo](#capítulo-4-o-batimento-ciclo-de-vida)
5. [Capítulo 5: Interação Galvânica (Input Avançado)](#capítulo-5-interação-galvânica)
6. [Capítulo 6: A Grande Referência de Componentes (API)](#capítulo-6-a-grande-referência)
7. [Capítulo 7: A Rede Neuronal (Mensagens Globais)](#capítulo-7-a-rede-neuronal)
8. [Capítulo 8: Controlo do Tempo e Assincronia](#capítulo-8-controlo-do-tempo)
9. [Capítulo 9: O Grande Receituário (Sistemas Complexos)](#capítulo-9-o-grande-receituário)
10. [Capítulo 10: Desempenho de Grau Industrial](#capítulo-10-desempenho)
11. [Capítulo 11: Sob o Capô (Internos do Motor)](#capítulo-11-sob-o-capô)
12. [Capítulo 12: Solução de Problemas (Troubleshooting)](#capítulo-12-solução-de-problemas)

---

## ⚡ Capítulo 0: Imersão Rápida

Para começares com força, vamos criar um objeto que não só se move, mas reage.

1. **Cria um Script:** Botão direito em Assets > Novo > Script (CES) > `Guardiao.ces`.
2. **Escreve:**
```ces
ve motor;
publico numero velocidadeGiro = 100;

alActualizar(delta) {
    rotacao += velocidadeGiro * delta;
    se (teclaPresionada("Space")) {
        posicion.x += 5;
    }
}
```
3. **Atribui:** Arrasta-o para uma Matéria. Clica em Play e pressiona Espaço!

---

## 🏛️ Capítulo 1: Filosofia e Arquitetura

### Porquê Creative Engine?
A maioria dos motores modernos sofre de **"Sobre-engenharia"**. O Creative Engine foi desenhado para eliminar a fricção entre o pensamento e a execução.

**O conceito de "Leis" e "Matérias":**
- **Matéria:** É o contentor vazio (o objeto). Não tem peso nem forma por si próprio.
- **Leis:** São os componentes. Ao adicionar uma Lei de "Física", a Matéria começa a cair. Ao adicionar uma Lei de "Script", a Matéria adquire vontade.

Esta arquitetura desacoplada permite que os teus jogos sejam extremamente modulares e fáceis de depurar.

---

## 🦴 Capítulo 2: A Linguagem CES

O CES não é uma linguagem nova do zero; é uma **Abstração de Alto Nível** sobre JavaScript (ES6+).

### A Magia da Omissão
No CES, o contexto é implícito. O motor sabe que se estás a escrever um script para o "Jogador", qualquer menção à `saude` refere-se à saúde *desse jogador*.
- **Antes:** `this.materia.getComponent("Health").currentHealth -= 10;`
- **Agora (CES):** `saude.damage(10);`

O transpilador encarrega-se de converter essa simplicidade em código JavaScript otimizado que o navegador pode executar a velocidades vertiginosas.

---

## 💎 Capítulo 3: O Inspetor Dinâmico

O Inspetor não é apenas uma lista de variáveis; é uma janela em tempo real para o estado do teu jogo.

### Atributos de Visibilidade
Usar `publico` antes de uma variável indica ao motor que deve criar um widget de edição na interface:

- **`publico numero`**: Cria um controlo deslizante e campo numérico.
- **`publico Materia`**: Cria um slot de "Drag & Drop" que apenas aceita objetos da cena.
- **`publico Prefab`**: Permite selecionar ficheiros `.ceprefab` da tua biblioteca.

**Dica técnica:** O motor realiza uma "Injeção de Dependências" automática. Se arrastares um objeto que tem um `SpriteRenderer` para uma variável de tipo `Sprite`, o motor extrairá automaticamente o componente correto.

---

## ⏱️ Capítulo 4: O Batimento: Ciclo de Vida Profundo

O teu script tem etapas biológicas:

1. **`começar()` (Construtor Tardio):** Executa-se uma vez quando o objeto entra na cena ativa. Usa-o para inicializar estados aleatórios ou procurar referências.
2. **`atualizar(delta)` (Loop Principal):** O lugar da lógica visual. Sincroniza-se com a taxa de atualização do teu ecrã (RequestAnimationFrame).
3. **`actualizarFijo(delta)` (Tick de Física):** Crucial para a estabilidade. Enquanto o `atualizar` pode variar segundo a carga gráfica, o `actualizarFijo` corre a intervalos constantes (ex: 50Hz), garantindo que as colisões não falhem.
4. **`alDestruir()` (Limpeza):** Ativa-se mesmo antes de o objeto desaparecer. Usa-o para libertar memória ou difundir mensagens de morte.

---

## ⌨️ Capítulo 5: Interação Galvânica (Input)

O motor abstrai a complexidade dos eventos de hardware numa API de consulta direta (Polling):

### Teclado
- `teclaPresionada("a")`: Devolve `verdadeiro` enquanto a tecla estiver premida.
- `teclaRecienPresionada("Space")`: Apenas devolve `verdadeiro` no primeiro frame da pressão. Ideal para saltos.

### Rato e Touch
- `botonMouseRecienPresionado(0)`: 0 é esquerdo, 1 central, 2 direito.
- `obtenerPosicionMouse()`: Devolve um objeto `{x, y}` em coordenadas do mundo.

---

## 📦 Capítulo 6: A Grande Referência de Componentes (API)

Aqui detalhamos as capacidades dos componentes mais importantes:

### 📍 Transformação (`posicion`, `transform`)
- **`.x`, `.y`**: Coordenadas espaciais.
- **`.rotacao`**: Ângulo em graus.
- **`.escala`**: Tamanho relativo (ex: 2 é o dobro).
- **`mirarA(objetivo)`**: Roda o objeto instantaneamente para outro objeto ou posição.

### ⚖️ Físicas (`fisica`, `rigidbody2D`)
- **`.velocity`**: Vetor de movimento atual `{x, y}`.
- **`.gravityScale`**: Quanta gravidade afeta o objeto (0 = flutua).
- **`applyForce(x, y)`**: Impulso constante (como um motor).
- **`applyImpulse(x, y)`**: Força instantânea (como uma explosão).

### 🩸 Saúde (`saude`, `vida`)
- **`.currentHealth`**: Vida atual.
- **`.maxHealth`**: Limite máximo.
- **`damage(n)`**: Subtrai vida e ativa eventos de morte se chegar a 0.
- **`heal(n)`**: Soma vida sem exceder o máximo.

---

## 📡 Capítulo 7: A Rede Neuronal (Mensagens)

Porquê evitar as referências diretas (`buscar()`)?
Se o Script A depende do Script B, e apagas o Script B, o Script A falhará. O sistema de **Mensagens** elimina este acoplamento.

- **`difundir("OndaDeCalor", { intensidade: 10 })`**: Envia um sinal ao ar. Não importa quem o ouça.
- **`alRecibir("OndaDeCalor", (dados) => { ... })`**: O script fica "a ouvir". Se a mensagem chegar, reage.

Este padrão (Observer) é a base dos jogos profissionais escaláveis.

---

## 🪄 Capítulo 8: Controlo do Tempo e Assincronia

### Corrotinas (`aguardar`)
No CES, todos os métodos são assíncronos por defeito. Isto permite-te escrever sequências temporais como se fossem uma lista de instruções:

```ces
async alHacerClick() {
    inverterH = verdadeiro;
    aguardar(0.5);
    inverterH = falso;
}
```

### O Loop Periódico (`cada`)
É uma forma elegante de criar "intervalos de vida":
```ces
começar() {
    cada(2) {
        imprimir("Passaram 2 segundos");
    }
}
```

---

## 🍳 Capítulo 9: O Grande Receituário (Cookbook)

### 🎒 Sistema de Inventário com Slots
```ces
ve motor;
publico numero maxSlots = 5;
variable items = [];

função adicionarItem(nome) {
    se (items.length < maxSlots) {
        items.push(nome);
        difundir("ActualizarUI", { inventario: items });
        retornar verdadeiro;
    }
    retornar falso;
}
```

### 🧠 IA de Chefe com Fases
```ces
ve motor;
publico numero vidaFase2 = 50;

atualizar(delta) {
    se (saude.currentHealth > vidaFase2) {
        comportamentoFase1();
    } senao {
        comportamentoFase2();
    }
}

função comportamentoFase2() {
    escala.x = 2; // O chefe cresce
    fisica.gravityScale = 0; // Começa a flutuar
}
```

---

## ⚙️ Capítulo 10: Desempenho Industrial

### O custo de `buscar()`
Chamar `buscar("Jogador")` obriga o motor a percorrer toda a lista de objetos. Se tens 1000 objetos e o fazes a cada frame, o jogo ficará lento.
**Solução:** Procura uma vez no `começar` e guarda a referência.

### Object Pooling
Criar e destruir objetos (`criar`, `destruir`) consome CPU e gera "lixo" que o navegador deve limpar.
**Melhor prática:** Para projéteis, cria um "pool" de 20 balas no início, desativa-as e ativa-as conforme as necesites.

---

## 🛠️ Capítulo 11: Sob o Capô

### O Processo de Transpilação
Quando guardas um ficheiro `.ces`, acontece isto:
1. **Scanner:** Procuram-se palavras-chave como `se`, `publico`, `ve`.
2. **Mapper:** Traduzem-se os aliases (ex: `fisica` -> `this.obtenerComponente('Rigidbody2D')`).
3. **Wrapper:** O teu código é envolvido numa classe ES6 que herda de `CreativeScriptBehavior`.
4. **Injection:** Injetam-se as APIs de entrada e motor.

Este processo garante que escreves código fácil mas executas código profissional.

---

## ❓ Capítulo 12: Solução de Problemas (FAQ)

**P: O meu objeto atravessa as paredes.**
R: Certifica-te de usar `actualizarFijo` para o movimento físico e de que o `Rigidbody2D` está em modo "Continuous" se o objeto for muito rápido.

**P: "TypeError: Cannot read properties of undefined (reading 'damage')"**
R: Estás a tentar chamar `saude.damage()` num objeto que não tem o componente **Health**. Adiciona-o no Inspetor.

---

## 🎉 Conclusão

Terminaste o Livro Mestre. Agora, o código não é uma linguagem estranha, mas uma ferramenta nas tuas mãos. Vai e constrói algo incrível.

---
*Desejas aprofundar mais? Explora o [Livro da Extensibilidade](README_LIBRERIAS.md).*
