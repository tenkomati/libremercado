# META-PROMPT: Sistema de Marketplace C2C de Alta Confianza (Competidor ML/FB)

1. INTRODUCCIÓN Y VISIÓN DEL PROYECTO
El Escenario Actual (El Problema)
El mercado de compra-venta de productos usados en Argentina está fracturado en dos extremos ineficientes:

La "Jungla" de Facebook Marketplace: Alta liquidez y 0% comisión, pero plagada de inseguridad, perfiles falsos y estafas presenciales. La falta de un sistema de pagos y envíos integrado deja al usuario desprotegido.

El "Peaje" de Mercado Libre: Seguridad robusta, pero a un costo asfixiante. Las comisiones (que pueden superar el 25%), la burocracia para vendedores ocasionales y la prioridad algorítmica a productos nuevos/tiendas oficiales han desplazado al usuario que solo quiere vender su usado de forma justa.

Nuestra Misión (Lo que buscamos)
Buscamos construir la "Tercera Vía": un Marketplace C2C (Consumer to Consumer) de Confianza Total y Bajo Costo.

Queremos democratizar el comercio de usados eliminando el "impuesto al miedo" de Facebook y el "impuesto al monopolio" de Mercado Libre. El objetivo es crear una plataforma donde vender un usado sea tan seguro como en Amazon, pero tan simple y directo como un mensaje de WhatsApp.

Objetivos Estratégicos
Seguridad por Identidad: Erradicar las estafas mediante validación biométrica obligatoria (KYC). Si no hay identidad real, no hay transacción.

Blindaje Financiero: Implementar un modelo de Escrow (Pago Protegido) donde la plataforma actúe como árbitro neutral, asegurando que el dinero solo se libere cuando el producto esté en manos del comprador.

Eficiencia de Costos: Mantener una estructura Lean (liviana) que permita cobrar comisiones mínimas (3-5%), enfocándose exclusivamente en el mercado de usados y la economía circular.

Fricción Cero: Utilizar IA para que publicar un producto sea cuestión de segundos, automatizando categorización, retoque de fotos y sugerencia de precios.




## 1. CONTEXTO DEL PROYECTO
**Nombre Clave:** libremercado
**Mercado Objetivo:** Argentina (2026).
**Problema a Resolver:** - Inseguridad y estafas en Facebook Marketplace.
- Altas comisiones y burocracia en Mercado Libre.
**Propuesta de Valor:** Un ecosistema "Lean", con identidad validada obligatoria, sistema de pago en garantía (Escrow) y comisiones significativamente más bajas.

## 2. STACK TECNOLÓGICO REQUERIDO
- **Frontend:** Next.js 15+ (App Router), Tailwind CSS, TypeScript.
- **Backend:** NestJS (Node.js) - [Adaptable según necesidad de performance].
- **Base de Datos:** PostgreSQL (Transaccional) + Redis (Cache/Mensajería).
- **Infraestructura:** Dockerizado, desplegado en AWS o Google Cloud Run.
- **Seguridad e IA:** - Integración con APIs de validación biométrica (RENAPER/Mati).
    - Modelos de Vision AI para optimización de fotos y detección de fraude.

## 3. ARQUITECTURA DE CONFIANZA (CORE LOGIC)
### A. Sistema de Escrow (Pago Protegido)
1. El Comprador paga -> Los fondos se retienen en una Wallet intermedia (Fideicomiso).
2. El Vendedor despacha -> Tracking integrado por API (Andreani/Correo Arg/Pickit).
3. Confirmación de Entrega -> El comprador tiene 48hs para validar.
4. Liberación de Fondos -> Traslado del dinero al vendedor menos una comisión mínima (3-5%).

### B. Validación de Identidad (KYC)
- No se permite publicar ni comprar sin validación de identidad vía DNI y biometría facial.
- Sistema de reputación basado en comportamiento real, no en pauta publicitaria.

## 4. LECCIONES APRENDIDAS (PARA EVITAR FALLOS HISTÓRICOS)
- **Anti-AlaMaula:** Control total de la transacción (pago y envío). No ser solo un sitio de clasificados.
- **Anti-DeRemate:** Mantener agilidad técnica y no depender de un solo socio estratégico que limite el crecimiento.
- **Anti-OLX:** Evitar el manejo de stock físico (modelo "Inventory-led"). Ser puramente un facilitador tecnológico.

## 5. FLUJO DE USUARIO (USER JOURNEY)
- **Vendedor:** Registro KYC -> Fotos asistidas por IA -> Precio sugerido por big data -> Publicación gratuita -> Envío con etiqueta generada -> Cobro inmediato tras validación.
- **Comprador:** prioridad Búsqueda por cercanía pero sino ofrecer mas lejos -> Pago protegido -> Recepción -> Confirmación/Disputa.

## 6. INSTRUCCIONES PARA LA IA (INSTRUCTIONS FOR THE MODEL)
"Actúa como un Senior Fullstack Developer y Product Manager experto en el mercado Fintech y E-commerce de Latam. Tu tarea es ayudarme a construir los módulos de este sistema siguiendo estos principios:
1. **Seguridad primero:** Cada endpoint debe contemplar validación de usuario y prevención de inyecciones/fraude.
2. **Performance:** El sitio debe cargar en menos de 1.5s (LCP). Prioriza Server Components en Next.js.
3. **Escalabilidad:** Diseña el esquema de base de datos pensando en millones de registros de productos.
4. **Foco en el ahorro:** Utiliza transferencias 3.0 e interoperabilidad bancaria para reducir costos de pasarela de pago tradicionales."

---
**FIN DEL ARCHIVO**