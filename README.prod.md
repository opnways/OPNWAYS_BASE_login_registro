# 🚀 CHECKLIST DE PRODUCCIÓN PARA AUTH-STARTER

Sigue estos pasos antes de enviar tráfico real al sistema. Este sistema está endurecido para funcionar en un **Escenario A** (todo bajo subdominios del mismo dominio `midominio.com`).

---

## 🔒 1. Secretos y Entorno
- [ ] Rotar `JWT_ACCESS_SECRET` y establecer uno fuerte en `.env`.
- [ ] Rotar `JWT_REFRESH_SECRET` y establecer uno fuerte en `.env`.
- [ ] Generar un hash fuerte o contraseña compleja para `METRICS_PASSWORD`.
- [ ] Asegurarse de que `NODE_ENV` es estrictamente `production`.

## 🍪 2. Cookies y Dominios
- [ ] Configurar `COOKIE_DOMAIN` con el nivel raíz compartido. (Ejemplo: `.midominio.com`).
- [ ] Configurar `CORS_ALLOWED_ORIGINS` sin un trailing slash `/`. (Ejemplo: `https://app.midominio.com`).

## 🐳 3. Despliegue en Docker
- [ ] Utilizar el archivo de orquestación de producción:
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
- [ ] Configurar el Reverse Proxy (NGINX/Traefik) para apuntar internamente al puerto `3000` del backend y el `80` del frontend.
- [ ] Cerrar el puerto `5432` de la base de datos de PostgreSQL en los Security Groups o Firewalls; no exponer el contenedor DB directamente a Internet.

## 📊 4. Observabilidad
- [ ] Configurar el recolector de Prometheus con el `METRICS_USER` y `METRICS_PASSWORD` en su `scrape_config`.
- [ ] Agregar un log scraper (por ejemplo, Promtail/FluentBit) que tome los logs en JSON o Morgan (que ahora incluyen Correlation ID `X-Request-Id`) para búsquedas en Loki / ELK.

## 🛠️ 5. Base de Datos
- [ ] Ejecutar migraciones completas o verificar que se ejecutaron auto-mágicamente: `docker compose exec backend npm run migrate`.
- [ ] Configurar volúmenes persistentes robustos (por ejemplo, EFS, EBS o montar volúmenes externos asegurados).

---
> **Anti-Chaos Note:** Los cambios estructurales se mantienen idénticos, garantizando mantenibilidad.