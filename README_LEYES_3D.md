# 📐 Desarrollo de Leyes 3D - Creative Engine

Este documento establece las reglas estrictas para la creación de componentes (**Leyes**) del motor 3D, garantizando la interoperabilidad y la facilidad de scripting.

---

## 📜 Regla de Oro: Apertura y API

**Cada Ley debe estar abierta a scripting con una API clara y permitir que otras leyes interactúen con ella sin duplicar lógica.**

### Principios Fundamentales:

1.  **Exposición Total:** Todas las propiedades críticas (masa, velocidad, color, radio, etc.) deben ser `public` y accesibles desde scripts `.ces`.
2.  **Métodos Accionables:** Define métodos como `addForce()`, `play()`, `stop()` que puedan ser llamados directamente tanto por la API interna como por el código del usuario.
3.  **No Duplicación:** Si una ley necesita una funcionalidad que ya existe en otra (ej: una ley de "Coche" necesita físicas), debe **usar** el componente existente (`Rigidbody3D`) en lugar de reescribir la lógica física internamente.
4.  **Alias Bilingües:** Cada propiedad y método debe tener su equivalente en español en `Components.js` para mantener la filosofía del motor.

---

## 🛠️ Componentes 3D Actuales

### ⚖️ Rigidbody3D (Física 3D)
Gestiona la masa, gravedad y fuerzas en el espacio tridimensional.
- **API Scripting:**
    - `fisica3D.addForce(x, y, z)`: Aplica una fuerza.
    - `fisica3D.velocity`: Obtiene/Establece el vector de velocidad.
    - `fisica3D.useGravity`: Booleano para activar/desactivar gravedad.

### 📦 BoxCollider3D / SphereCollider3D
Definen el volumen físico para colisiones 3D.
- **API Scripting:**
    - `colisionadorCaja3D.size`: Ajusta el tamaño de la caja.
    - `colisionadorEsfera3D.radius`: Ajusta el radio de la esfera.
    - `isTrigger`: Permite que el objeto sea atravesable pero detectable.

### 🎨 MeshRenderer3D (Malla 3D)
Renderiza modelos geométricos (Cubo, Esfera, Plano, etc.).
- **API Scripting:**
    - `renderizadorDeMalla3D.color`: Cambia el color del material.
    - `renderizadorDeMalla3D.meshType`: Cambia la forma geométrica en tiempo real.

---

## 🔗 Ejemplo de Interoperabilidad

Un script de "Proyectil 3D" no debería calcular su propia trayectoria. Debería usar el `Rigidbody3D` del objeto:

```ces
// Proyectil3D.ces
ve motor;

publico numero fuerza = 1000;

alEmpezar() {
    // Usamos la API de la ley de físicas en lugar de mover el transform manualmente
    fisica3D.addForce(0, 0, fuerza);
}
```
