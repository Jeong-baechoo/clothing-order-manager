#!/bin/sh
# 캐시 삭제 및 종속성 재설치 스크립트

# 개발 서버 중지 (실행 중인 경우)
echo "개발 서버를 중지합니다..."
taskkill /f /im node.exe 2>nul

# .next 캐시 디렉터리 삭제
echo ".next 캐시 디렉터리를 삭제합니다..."
rmdir /s /q .next 2>nul

# node_modules 삭제 (선택적)
echo "node_modules를 삭제합니다..."
rmdir /s /q node_modules 2>nul

# 패키지 재설치
echo "패키지를 재설치합니다..."
npm install --legacy-peer-deps

# 개발 서버 재시작
echo "개발 서버를 시작합니다..."
npm run dev
