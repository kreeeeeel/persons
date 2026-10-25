package com.persons.id.configuration

import com.persons.id.configuration.properties.S3Properties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import java.net.URI
import java.time.Duration

private const val CONNECT_TIMEOUT_SECONDS = 3L
private const val SOCKET_TIMEOUT_SECONDS = 5L
private const val CALL_TIMEOUT_SECONDS = 10L

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(S3Properties::class)
class S3Configuration {
    @Bean(destroyMethod = "close")
    fun s3Client(properties: S3Properties): S3Client = S3Client.builder()
        .endpointOverride(URI.create(properties.endpoint))
        .region(Region.of(properties.region))
        .credentialsProvider(
            StaticCredentialsProvider.create(
                AwsBasicCredentials.create(properties.credentials.accessKey, properties.credentials.secretKey),
            ),
        )
        .forcePathStyle(true)
        .serviceConfiguration(
            software.amazon.awssdk.services.s3.S3Configuration.builder()
                .chunkedEncodingEnabled(false).build(),
        )
        .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
        .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
        .httpClientBuilder(
            UrlConnectionHttpClient.builder()
                .connectionTimeout(Duration.ofSeconds(CONNECT_TIMEOUT_SECONDS))
                .socketTimeout(Duration.ofSeconds(SOCKET_TIMEOUT_SECONDS)),
        )
        .overrideConfiguration(
            ClientOverrideConfiguration.builder()
                .apiCallTimeout(Duration.ofSeconds(CALL_TIMEOUT_SECONDS)).build(),
        )
        .build()
}
