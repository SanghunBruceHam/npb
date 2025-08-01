#!/usr/bin/env node

/**
 * 데이터 파일 검증 스크립트
 * 크롤링 후 데이터가 제대로 추가되었는지 확인
 */

const fs = require('fs');
const path = require('path');

function verifyData() {
    const year = new Date().getFullYear();
    const filePath = path.join(__dirname, '..', 'data', `${year}-season-data-clean.txt`);
    
    if (!fs.existsSync(filePath)) {
        console.error('❌ 파일이 없습니다:', filePath);
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // 마지막 날짜 확인
    let lastDate = '';
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].match(/^\d{4}-\d{2}-\d{2}$/)) {
            lastDate = lines[i];
            break;
        }
    }
    
    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    console.log('📊 데이터 파일 검증 결과:');
    console.log(`  📁 파일: ${filePath}`);
    console.log(`  📅 마지막 데이터 날짜: ${lastDate}`);
    console.log(`  📅 오늘 날짜: ${today}`);
    console.log(`  📅 어제 날짜: ${yesterday}`);
    
    // 경기 수 계산
    let gameCount = 0;
    for (const line of lines) {
        if (line.includes('(H)') && !line.match(/^\d{4}-\d{2}-\d{2}$/)) {
            gameCount++;
        }
    }
    
    console.log(`  🎮 총 경기 수: ${gameCount}`);
    
    // 마지막 10줄 출력
    console.log('\n📝 파일 마지막 10줄:');
    const last10 = lines.slice(-10);
    last10.forEach(line => console.log(`  ${line}`));
    
    // 8월 데이터 확인
    const augustData = lines.filter(line => line.startsWith('2025-08'));
    if (augustData.length > 0) {
        console.log(`\n✅ 8월 데이터 발견: ${augustData.length}개 날짜`);
        augustData.forEach(date => console.log(`  ${date}`));
    } else {
        console.log('\n❌ 8월 데이터가 없습니다!');
    }
}

// 실행
verifyData();