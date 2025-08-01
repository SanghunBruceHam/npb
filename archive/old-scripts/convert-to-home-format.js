#!/usr/bin/env node

/**
 * clean.txt 파일을 홈팀 (H) 표시 형식으로 변환
 * 기존: "팀1 점수:점수 팀2" (팀2가 홈팀)
 * 새형식: "팀1 점수:점수 팀2(H)"
 */

const fs = require('fs');

try {
    console.log('📝 clean.txt 파일 형식 변환 시작...');
    
    // 파일 읽기
    const data = fs.readFileSync('./2025-season-data-clean.txt', 'utf8');
    const lines = data.trim().split('\n');
    
    const convertedLines = [];
    let convertedCount = 0;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // 빈 줄이나 날짜 줄은 그대로 유지
        if (!trimmedLine || trimmedLine.match(/^\d{4}-\d{2}-\d{2}$/)) {
            convertedLines.push(line);
            continue;
        }
        
        // 경기 결과 라인 처리
        const gameMatch = trimmedLine.match(/^(.+?)\s+(\d+):(\d+)\s+(.+)$/);
        if (gameMatch) {
            const [, team1, score1, score2, team2] = gameMatch;
            
            // 이미 (H) 표시가 있는지 확인
            if (team2.includes('(H)')) {
                convertedLines.push(line); // 이미 변환됨
            } else {
                // 홈팀에 (H) 표시 추가
                const convertedLine = `${team1} ${score1}:${score2} ${team2}(H)`;
                convertedLines.push(convertedLine);
                convertedCount++;
            }
        } else {
            convertedLines.push(line); // 매칭되지 않는 라인은 그대로
        }
    }
    
    // 변환된 내용을 파일에 저장
    const convertedContent = convertedLines.join('\n');
    fs.writeFileSync('./2025-season-data-clean.txt', convertedContent);
    
    console.log(`✅ 변환 완료: ${convertedCount}개 경기 라인 변환됨`);
    console.log('📄 새로운 형식 예시:');
    
    // 변환된 결과 미리보기
    const previewLines = convertedLines.slice(0, 15);
    previewLines.forEach((line, index) => {
        if (line.trim() && !line.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.log(`   ${line}`);
        }
    });
    
} catch (error) {
    console.error('❌ 변환 실패:', error.message);
    process.exit(1);
}