#!/bin/bash
git pull
docker build -t registry.cn-hangzhou.aliyuncs.com/sijinhui/chatgpt-next-web .
docker push registry.cn-hangzhou.aliyuncs.com/sijinhui/chatgpt-next-web
docker-compose up -d

# 清理缓存