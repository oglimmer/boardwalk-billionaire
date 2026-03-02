FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B
COPY src ./src
RUN ./mvnw package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN adduser -D -u 10001 appuser
COPY --from=build /app/target/*.jar app.jar
RUN chown appuser:appuser app.jar
USER 10001
EXPOSE 8080
CMD java ${JAVA_OPTS} -jar app.jar
