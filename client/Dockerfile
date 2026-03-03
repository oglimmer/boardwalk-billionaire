FROM node:24.14.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
RUN rm /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN adduser -D -u 10001 appuser && \
    chown -R appuser:appuser /usr/share/nginx/html /var/cache/nginx /tmp
USER 10001
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
