#!/usr/bin/env node

/**
 * 수동으로 8월 1일 데이터 추가 (테스트용)
 */

const fs = require('fs');
const path = require('path');

const august1Data = `

2025-08-01
KIA 3:2 한화(H)
삼성 2:4 LG(H)
키움 2:0 롯데(H)
두산 2:7 SSG(H)
NC 5:3 KT(H)
`;

const filePath = path.join(__dirname, '..', 'data', '2025-season-data-clean.txt');

// 파일에 추가
fs.appendFileSync(filePath, august1Data, 'utf8');
console.log('✅ 8월 1일 데이터 추가 완료');

// 검증
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const augustLines = lines.filter(line => line.startsWith('2025-08'));

console.log(`📊 8월 데이터 확인: ${augustLines.length}개 날짜`);
augustLines.forEach(line => console.log(`  ${line}`));