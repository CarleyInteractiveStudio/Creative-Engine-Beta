# 📜 Guia Mestre de Scripting (CES) - Creative Engine

O Creative Engine utiliza o **CES (Creative Engine Script)**, uma linguagem poderosa baseada em JavaScript, mas simplificada para criadores de jogos. Este guia ensinará você desde o básico até os sistemas mais avançados.

---

## 🚀 Conceitos Fundamentais

### 1. A Importação Obrigatória
Todo script deve começar com a instrução para conectar com o motor:
```ces
ve motor;
```

### 2. Acesso Direto (Sem Prefixos)
Ao contrário de outros motores, você NÃO precisa escrever `this.` ou `mtr.` para acessar os componentes de um objeto. Se o objeto tiver um `SpriteRenderer`, basta escrever `renderizadorDeSprite`.

### 3. Multilíngue por Design
Você pode programar usando termos em espanhol ou inglês indistintamente. O motor entende ambos. Por exemplo, `fisica` é o mesmo que `rigidbody2D`.

---

## 💎 Variáveis Públicas (Inspetor)
Para que uma variável apareça no Inspetor do editor, use a palavra-chave `publico`.

```ces
publico numero velocidade = 5;
publico texto nomeJogador = "Herói";
publico booleano esInvencible = falso;
publico Materia objetivo; // Aparecerá um quadro para arrastar objetos
```

---

## 🧠 Detecção de UI
```ces
// Verifica se dois elementos de interface se sobrepõem (ideal para inventários)
si (solapamientoUI(item, ranura)) {
    imprimir("Objeto colocado!");
}
```

---

## 🛠️ Utilidades do Motor
- `buscar(nome)`: Encontra um objeto na cena.
- `destruir(materia)`: Elimina um objeto.
- `lanzarRayo(origem, direcao, distancia, tag)`: Raycasting 2D.
- `estaTocandoTag(tag)`: Detecção rápida de colisões.
- `instanciar(original, x, y)`: Clona um objeto existente.
- `crear miPrefab`: Instancia um prefab pelo nome.
- `solapamientoUI(mtrA, mtrB)`: Detecta colisão entre elementos de interface.
