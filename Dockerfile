FROM nginx:alpine
COPY index.html styles.css /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/
EXPOSE 80
