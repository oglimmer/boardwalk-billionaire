FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN adduser -D -u 10001 appuser
COPY --from=build /app/target/*.jar app.jar
RUN chown appuser:appuser app.jar
USER 10001
EXPOSE 8080
CMD java ${JAVA_OPTS} -jar app.jar
