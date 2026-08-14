# BEGIN ANSON DEPLOY MANAGED BLOCK
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm test
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build ["/app/dist","/usr/share/nginx/html"]
RUN sed -i 's/listen[[:space:]]*80;/listen 80;/' /etc/nginx/conf.d/default.conf
EXPOSE 80
# END ANSON DEPLOY MANAGED BLOCK
