# Auth Starter Kit (Node.js + React + PostgreSQL)

Este proyecto es una base clonable orientada a la seguridad (**Auth Starter Kit**) construida con un stack moderno de Node.js, React y PostgreSQL. Emplea las mejores prácticas de seguridad, como el patrón *Double Submit Cookie* para CSRF, rotación de *Refresh Tokens* y detección de ataques de reúso (*Reuse Detection*).

## 📋 Requisitos Previos

- [Docker](https://www.docker.com/get-started/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## 🚀 Instalación y Ejecución

1. **Clonar el repositorio** y copiar los archivos de entorno:

   ```bash
   cp .env.example .env
   ```

2. **Construir y levantar la infraestructura** (Backend, Frontend, Base de datos y Mailhog):

   ```bash
   docker-compose up -d --build
   ```

3. **Acceder a los endpoints y aplicaciones**:
   - **Frontend (React)**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: `http://localhost:3000/api/auth`
   - **Métricas Prometheus**: [http://localhost:3000/metrics](http://localhost:3000/metrics)
   - **Bandeja de Correos (Mailhog)**: [http://localhost:8025](http://localhost:8025)

---

## 🧪 Ejecución de Tests (Supertest + Node:test)

El backend de este starter kit posee una suite de tests end-to-end (E2E) e integraciones escritas con el test runner nativo de Node.js (`node:test`) y `supertest`.

Dado que el entorno está containerizado, la forma óptima de ejecutar las pruebas de seguridad y de los endpoints es **dentro del contenedor del backend**.

### Ejecutar todos los tests

Para correr todas las suites de prueba de una sola vez, interactúa con el contenedor `backend` activo:

```bash
docker-compose exec backend node --test
```

### Ejecutar un test específico

Si estás modeficando o revisando una mecánica de seguridad en particular, puedes ejecutar un único archivo de prueba pasándole la ruta específica:

1. **Test del límite de tamaño de las peticiones (Payloads < 50kb)**:

   ```bash
   docker-compose exec backend node --test tests/payload.test.js
   ```

2. **Test de la protección CSRF (Double Submit Cookie)**:

   ```bash
   docker-compose exec backend node --test tests/csrf.test.js
   ```

3. **Test de rotación de tokens y detección de ataques de reúso (Reuse Attack)**:

   ```bash
   docker-compose exec backend node --test tests/reuse.test.js
   ```

4. **Test de revocación en cascada de sesiones tras aplicar un reseteo de contraseña**:

   ```bash
   docker-compose exec backend node --test tests/reset_revocation.test.js
   ```

Nótese que estas pruebas utilizan la base de datos de Docker mediante tu `DATABASE_URL` y probarán los bloqueos y transacciones de SQL reales sin afectar o requerir mocks agresivos, validando la aplicación como una caja negra (Black-Box Testing).

---

## 🛠️ Comandos Útiles de Docker

- **Ver logs en tiempo real**:

  ```bash
  docker-compose logs -f
  ```

  *(Añade el flag de backend para aislarlo: `docker-compose logs -f backend`)*

- **Detener los servicios sin borrar la base de datos**:

  ```bash
  docker-compose down
  ```

- **Empezar desde cero y borrar los volúmenes (Base de Datos)**:

  ```bash
  docker-compose down -v
  ```

- **Forzar la ejecución manual de las migraciones SQL**:
  Las migraciones corren automáticamente al arrancar el backend pre-start, pero si fuesen necesarias ejecutarlas a mano:

  ```bash
  docker-compose exec backend node src/migrations/run.js
  ```
