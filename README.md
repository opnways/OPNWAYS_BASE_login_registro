# Login y Registro con Docker

Este proyecto es una aplicación web simple de registro e inicio de sesión desarrollada con PHP y MySQL, empaquetada en contenedores Docker.

## 📋 Requisitos Previos

- [Docker](https://www.docker.com/get-started/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## 🚀 Instalación y Ejecución

1. **Clonar el repositorio** (o descargar los archivos del proyecto).

2. **Abrir una terminal** en el directorio que contiene el archivo `docker-compose.yml`.

3. **Construir y ejecutar** los contenedores con el siguiente comando:

   ```bash
   docker-compose up -d --build
   ```

   - `up`: Crea y arranca los servicios.
   - `-d`: Ejecuta los contenedores en segundo plano (detached mode).
   - `--build`: Fuerza la reconstrucción de las imágenes antes de arrancar.

4. **Acceder a la aplicación**:
   Una vez que los contenedores estén funcionando, puedes acceder a la aplicación abriendo tu navegador y visitando:
   - **Aplicación PHP**: `http://localhost`
   - **phpMyAdmin** (gestión de base de datos): `http://localhost:8080`

## 🛠️ Comandos Útiles

- **Detener los contenedores**:

  ```bash
  docker-compose down
  ```

- **Detener y eliminar los contenedores y redes** (manteniendo los datos de la base de datos):

  ```bash
  docker-compose down -v
  ```

- **Ver los logs** de los contenedores:

  ```bash
  docker-compose logs -f
  ```

- **Acceder a la terminal** del contenedor PHP:

  ```bash
  docker-compose exec php bash
  ```

## 📂 Estructura del Proyecto

- `docker-compose.yml`: Define los servicios (PHP, MySQL, phpMyAdmin).
- `Dockerfile`: Configuración para construir la imagen PHP.
- `src/`: Código fuente de la aplicación PHP (registro, login, dashboard).
- `db/`: Scripts de inicialización de la base de datos.

## 🔐 Credenciales por Defecto

- **MySQL**: Usuario `root`, contraseña `root_password`.
- **phpMyAdmin**: Usuario `root`, contraseña `root_password`.
- **Aplicación PHP**: Puedes crear usuarios registrándote en la aplicación.
