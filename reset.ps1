# 캐시 삭제 및 종속성 재설치 스크립트

# 개발 서버 중지 (실행 중인 경우)
Write-Host "개발 서버를 중지합니다..." -ForegroundColor Yellow
Stop-Process -Name "node" -ErrorAction SilentlyContinue

# .next 캐시 디렉터리 삭제
Write-Host ".next 캐시 디렉터리를 삭제합니다..." -ForegroundColor Yellow
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue

# node_modules 삭제 (선택적)
Write-Host "node_modules를 삭제합니다..." -ForegroundColor Yellow
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# 패키지 재설치
Write-Host "패키지를 재설치합니다..." -ForegroundColor Yellow
npm install --legacy-peer-deps

# 개발 서버 재시작
Write-Host "개발 서버를 시작합니다..." -ForegroundColor Yellow
npm run dev
