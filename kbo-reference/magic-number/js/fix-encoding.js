#!/usr/bin/env node

/**
 * 인코딩 문제 해결 스크립트
 * 크롤링 후 깨진 한글을 복원
 */

const fs = require('fs');
const path = require('path');

function fixEncoding() {
    const year = new Date().getFullYear();
    const filePath = path.join(__dirname, '..', 'data', `${year}-season-data-clean.txt`);
    
    if (!fs.existsSync(filePath)) {
        console.log('파일이 없습니다:', filePath);
        return;
    }
    
    // 파일 읽기
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 깨진 팀명 복원
    const replacements = [
        // 두산
        [/[\xEB\x91\x90-\x9F][\xEC\x82-\x84][\xB0-\xBF]|두산/g, '두산'],
        // 삼성
        [/[\xEC\x82\xBC-\xBF][\xEC\x84-\x86][\xB1-\xBF]|삼성/g, '삼성'],
        // 한화
        [/[\xED\x95-\x97][\x9C-\x9F][\xED\x99-\x9B][\x94-\x97]|한화/g, '한화'],
        // 롯데
        [/[\xEB\xA1-\xA3][\xAF-\xB1][\xEB\x8D-\x8F][\xB0-\xB2]|롯데/g, '롯데'],
        // 키움
        [/[\xED\x82-\x84][\xA4-\xA6][\xEC\x9B-\x9D][\x80-\x82]|키움/g, '키움'],
    ];
    
    // 복원 적용
    let fixed = content;
    for (const [pattern, replacement] of replacements) {
        fixed = fixed.replace(pattern, replacement);
    }
    
    // 결과 저장
    fs.writeFileSync(filePath, fixed, 'utf8');
    console.log('✅ 인코딩 문제 해결 완료');
}

// 실행
fixEncoding();