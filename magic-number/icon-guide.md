# 🎨 KBO 매직넘버 계산기 아이콘 가이드

## 1. 📱 자동 생성 도구 (추천)

### A. PWA Builder (Microsoft)
- **URL**: https://www.pwabuilder.com/imageGenerator
- **장점**: 무료, 모든 크기 자동 생성, 고품질
- **사용법**:
  1. 기본 512x512 이미지 업로드
  2. 자동으로 모든 PWA 필요 크기 생성
  3. ZIP 파일로 다운로드

### B. Favicon.io
- **URL**: https://favicon.io/favicon-generator/
- **장점**: 텍스트→아이콘 자동 변환
- **설정값**:
  - 텍스트: "KBO" 또는 "⚾"
  - 배경: #1a237e (브랜드 컬러)
  - 폰트: Noto Sans KR

### C. RealFaviconGenerator
- **URL**: https://realfavicongenerator.net/
- **장점**: 모든 플랫폼 호환 아이콘 생성
- **특징**: 안드로이드, iOS, 윈도우 등 각각 최적화

## 2. 🎨 디자인 가이드라인

### 색상 팔레트
```css
주 색상: #1a237e (진한 파랑)
보조 색상: #3949ab (밝은 파랑)
강조 색상: #ff6b6b (빨강)
텍스트: #ffffff (흰색)
```

### 아이콘 구성 요소
1. **배경**: 브랜드 그라데이션
2. **메인 텍스트**: "KBO" (굵은 폰트)
3. **서브 텍스트**: "매직넘버" (작은 크기)
4. **장식**: ⚾ 야구공 이모지

### 권장 크기별 디자인
- **72x72 ~ 152x152**: 간단한 "KBO" 텍스트만
- **192x192 이상**: "KBO" + "매직넘버" + 야구공

## 3. 🛠️ 수동 제작 (고급)

### Figma/Canva 템플릿
```
캔버스 크기: 512x512px
배경: 그라데이션 (#1a237e → #3949ab)
둥근 모서리: 77px (15%)

요소 배치:
- 상단 (20%): ⚾ 이모지
- 중앙 (40%): "KBO" (굵은 폰트)
- 하단 (20%): "매직넘버" (얇은 폰트)
```

### 포토샵 액션 스크립트
```javascript
// Photoshop 스크립트 (선택사항)
function createKBOIcon(size) {
    var doc = app.documents.add(size, size, 72, "KBO-Icon-" + size);
    
    // 그라데이션 배경
    var bgLayer = doc.artLayers.add();
    bgLayer.name = "Background";
    
    // 텍스트 레이어
    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.textItem.contents = "KBO";
    textLayer.textItem.size = size * 0.3;
    
    return doc;
}
```

## 4. 📋 필요한 아이콘 크기 목록

### PWA Manifest 필수
- [ ] 72x72px
- [ ] 96x96px
- [ ] 128x128px
- [ ] 144x144px
- [ ] 152x152px
- [ ] 192x192px
- [ ] 384x384px
- [ ] 512x512px

### 추가 권장 크기
- [ ] 16x16px (favicon)
- [ ] 32x32px (favicon)
- [ ] 180x180px (iOS)
- [ ] 270x270px (Windows)

## 5. 🚀 빠른 시작 (5분 완성)

1. **generate-icons.html** 파일을 브라우저에서 열기
2. 원하는 크기 아이콘 클릭하여 다운로드
3. `/magic-number/icons/` 폴더에 저장
4. manifest.json에서 경로 확인

## 6. 💡 Pro Tips

### SEO 최적화
- 파일명: `icon-192x192.png` (명확한 네이밍)
- 압축: TinyPNG로 용량 최적화
- 포맷: PNG (투명 배경 지원)

### 접근성
- 고대비 색상 사용
- 명확한 텍스트 가독성
- 작은 크기에서도 인식 가능한 디자인

### 브랜딩 일관성
- 기존 사이트 컬러 팔레트 유지
- 로고/폰트 스타일 통일
- 각 플랫폼별 가이드라인 준수