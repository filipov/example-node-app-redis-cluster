#!/usr/bin/env bash

mkdir -p .redis
wget "https://storage.yandexcloud.net/cloud-certs/CA.pem" --output-document .redis/YandexInternalRootCA.crt && \
chmod 0655 .redis/YandexInternalRootCA.crt
