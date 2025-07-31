# KBO 매직넘버 계산기 프로젝트 정보 표시

Write-Host @"
🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆
🏆                                                          🏆
🏆             ⚾ KBO 매직넘버 계산기 ⚾                      🏆
🏆                                                          🏆
🏆   📊 2025 KBO 리그 실시간 매직넘버 & 플레이오프 진출 조건    🏆
🏆                                                          🏆
🏆   🌐 웹사이트: kbo.mahalohana-bruce.com/magic-number/     🏆
🏆   🤖 자동화: GitHub Actions (하루 3회)                   🏆
🏆   📱 PWA: 모바일 앱 설치 지원                             🏆
🏆                                                          🏆
🏆   ⚠️  다른 GitHub 프로젝트와 혼동하지 마세요!               🏆
🏆                                                          🏆
🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆
"@ -ForegroundColor Yellow

Write-Host "📋 프로젝트 정보:" -ForegroundColor Cyan
Write-Host "  📁 폴더명: $(Split-Path -Leaf $PWD)" -ForegroundColor White
Write-Host "  🏷️  프로젝트: KBO 매직넘버 계산기" -ForegroundColor White
Write-Host "  💻 기술: JavaScript, Node.js, GitHub Actions" -ForegroundColor White
Write-Host "  📅 마지막 업데이트: $(Get-Date -Format 'yyyy-MM-dd')" -ForegroundColor White
Write-Host ""

Write-Host "🚀 주요 명령어:" -ForegroundColor Green
Write-Host "  npm run update-data              - 데이터 수동 업데이트" -ForegroundColor White
Write-Host "  .\setup-scheduler.ps1 -Install   - Windows 자동화 설정" -ForegroundColor White
Write-Host "  .\project-info.ps1               - 이 정보 다시 보기" -ForegroundColor White
Write-Host ""

Write-Host "📊 현재 상태:" -ForegroundColor Magenta

# 데이터 파일 확인
if (Test-Path "magic-number/kbo-rankings.json") {
    $lastModified = (Get-Item "magic-number/kbo-rankings.json").LastWriteTime.ToString("yyyy-MM-dd HH:mm")
    Write-Host "  ✅ 데이터 파일: 존재 (최종 수정: $lastModified)" -ForegroundColor Green
} else {
    Write-Host "  ❌ 데이터 파일: 없음" -ForegroundColor Red
}

# GitHub Actions 확인
if (Test-Path ".github/workflows") {
    Write-Host "  ✅ GitHub Actions: 설정됨" -ForegroundColor Green
} else {
    Write-Host "  ❌ GitHub Actions: 설정 안됨" -ForegroundColor Red
}

# 로컬 자동화 확인
if (Test-Path "auto-update.ps1") {
    Write-Host "  ✅ Windows 자동화: 설정됨" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Windows 자동화: 설정 안됨" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 웹사이트에서 확인: https://kbo.mahalohana-bruce.com/magic-number/" -ForegroundColor Blue
Write-Host ""