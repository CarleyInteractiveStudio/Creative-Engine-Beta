# 🧩 Guia de Componentes (Leis) - Creative Engine

No Creative Engine, as **Matérias** (objetos) ganham vida através das **Leis** (componentes). Cada Lei adiciona uma funcionalidade específica.

---

## 🏗️ 1. Componentes Base

### 📍 Transform (Posição)
```ces
posição.x += 5;
rotação += 45;
escala.x = 2;
inverterH = verdadeiro;
```

---

## 🚗 4. Veículos e Controladores Avançados

### 🚁 HelicopterController
Simulação de voo lateral para helicópteros.
- **Parâmetros:** Potência, vDespegue (potência de descolagem), agilidade e autoEstabilidade.

### ✈️ PlaneController
Física aerodinâmica e voo lateral.

### 🏎️ VehicleTopDown
Controle arcade para carros (vista superior).

---

## 🦴 7. Animação, Esqueleto e Iluminação

### 🦴 SkeletonRenderer e IK (Cinemática Inversa)
- **SkeletonRenderer:** Renderiza malhas deformadas por ossos.
- **IKManager2D:** Controla cadeias de ossos para que uma mão ou pé siga um alvo.

### 💡 Iluminação 2D
- **PointLight2D:** Luz em todas as direções.
- **SpotLight2D:** Luz focal (cone).
