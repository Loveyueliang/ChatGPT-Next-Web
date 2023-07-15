#!/bin/bash
source /root/miniconda3/etc/profile.d/conda.sh
conda activate
git pull
docker build -t registry.cn-hangzhou.aliyuncs.com/sijinhui/chatgpt-next-web .
docker push registry.cn-hangzhou.aliyuncs.com/sijinhui/chatgpt-next-web
docker-compose up -d

# 清理缓存
sleep 2
tccli cdn PurgePathCache --cli-unfold-argument --Paths 'https://chat.xiaosi.cc/' --FlushType delete