#!/usr/bin/env node

/**
 * Daum Sports DOM 구조 정밀 분석기
 */

const puppeteer = require('puppeteer');

class DaumDOMAnalyzer {
    constructor() {
        this.browser = null;
        this.page = null;
        console.log('🔍 Daum Sports DOM 구조 정밀 분석 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    async analyzeDaumStructure() {
        try {
            const url = 'https://sports.daum.net/schedule/kbo?date=202507';
            console.log(`📡 페이지 로드: ${url}`);
            
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, 5000));

            // DOM 구조 상세 분석
            const analysis = await this.page.evaluate(() => {
                console.log('=== DOM 구조 상세 분석 시작 ===');
                
                const result = {
                    tables: [],
                    sampleRows: [],
                    teamElements: [],
                    scoreElements: []
                };
                
                // 모든 테이블 분석
                const tables = document.querySelectorAll('table');
                console.log(`총 테이블 수: ${tables.length}`);
                
                tables.forEach((table, index) => {
                    const rows = table.querySelectorAll('tr');
                    const tableText = table.textContent || '';
                    const hasKBOContent = tableText.includes('LG') || tableText.includes('KIA') || tableText.includes('삼성');
                    
                    if (hasKBOContent) {
                        console.log(`\n=== 테이블 ${index + 1} (KBO 관련) ===`);
                        console.log(`클래스: ${table.className}`);
                        console.log(`ID: ${table.id}`);
                        console.log(`행 수: ${rows.length}`);
                        
                        const tableInfo = {
                            index: index,
                            className: table.className,
                            id: table.id,
                            rowCount: rows.length,
                            sampleRows: []
                        };
                        
                        // 각 행 분석 (처음 20개만)
                        Array.from(rows).slice(0, 20).forEach((row, rowIndex) => {
                            const cells = row.querySelectorAll('td, th');
                            if (cells.length > 0) {
                                const cellData = Array.from(cells).map(cell => {
                                    const text = cell.textContent?.trim() || '';
                                    const img = cell.querySelector('img');
                                    const imgAlt = img ? img.alt : '';
                                    const className = cell.className;
                                    
                                    return {
                                        text: text,
                                        imgAlt: imgAlt,
                                        className: className,
                                        combined: (text + ' ' + imgAlt).trim()
                                    };
                                });
                                
                                const rowInfo = {
                                    rowIndex: rowIndex,
                                    cellCount: cells.length,
                                    cells: cellData,
                                    fullText: row.textContent?.trim() || ''
                                };
                                
                                console.log(`행 ${rowIndex}: ${cells.length}셀 - ${rowInfo.fullText.substring(0, 100)}`);
                                tableInfo.sampleRows.push(rowInfo);
                                
                                // 팀명이 포함된 행 특별 분석
                                const teams = ['LG', '삼성', 'KT', 'SSG', 'NC', 'KIA', '롯데', '두산', '키움', '한화'];
                                const hasTeam = teams.some(team => rowInfo.fullText.includes(team));
                                
                                if (hasTeam) {
                                    console.log(`  ⭐ 팀명 포함 행: ${rowInfo.fullText}`);
                                    console.log(`  셀 상세:`);
                                    cellData.forEach((cell, cellIndex) => {
                                        if (cell.combined) {
                                            console.log(`    셀${cellIndex}: "${cell.combined}" (class: ${cell.className})`);
                                        }
                                    });
                                }
                            }
                        });
                        
                        result.tables.push(tableInfo);
                    }
                });
                
                // 팀 로고 이미지 찾기
                const teamImages = document.querySelectorAll('img[alt*="LG"], img[alt*="KIA"], img[alt*="삼성"], img[alt*="KT"], img[alt*="SSG"], img[alt*="NC"], img[alt*="롯데"], img[alt*="두산"], img[alt*="키움"], img[alt*="한화"]');
                console.log(`\n팀 로고 이미지 수: ${teamImages.length}`);
                
                teamImages.forEach((img, index) => {
                    if (index < 10) { // 처음 10개만
                        console.log(`이미지 ${index + 1}: alt="${img.alt}", src="${img.src.substring(0, 50)}..."`);
                        result.teamElements.push({
                            alt: img.alt,
                            src: img.src,
                            parentText: img.parentElement?.textContent?.trim() || ''
                        });
                    }
                });
                
                // 점수 패턴 찾기
                const allText = document.body.textContent || '';
                const scoreMatches = [...allText.matchAll(/(\d+)\s*:\s*(\d+)/g)];
                console.log(`\n점수 패턴 (X:Y) 발견: ${scoreMatches.length}개`);
                
                scoreMatches.slice(0, 10).forEach((match, index) => {
                    console.log(`점수 ${index + 1}: ${match[0]}`);
                    result.scoreElements.push(match[0]);
                });
                
                return result;
            });

            console.log('\n📊 분석 완료');
            console.log(`KBO 관련 테이블: ${analysis.tables.length}개`);
            console.log(`팀 이미지: ${analysis.teamElements.length}개`);
            console.log(`점수 패턴: ${analysis.scoreElements.length}개`);
            
            // 가장 유력한 테이블의 구조 출력
            if (analysis.tables.length > 0) {
                const mainTable = analysis.tables[0];
                console.log(`\n🎯 메인 테이블 구조 (테이블 ${mainTable.index + 1}):`);
                console.log(`클래스: ${mainTable.className}`);
                console.log(`총 행 수: ${mainTable.rowCount}`);
                
                console.log('\n📋 샘플 행들:');
                mainTable.sampleRows.forEach(row => {
                    if (row.cells.some(cell => cell.combined.length > 0)) {
                        console.log(`\n행 ${row.rowIndex} (${row.cellCount}셀):`);
                        row.cells.forEach((cell, cellIndex) => {
                            if (cell.combined) {
                                console.log(`  셀${cellIndex}: "${cell.combined}"`);
                            }
                        });
                    }
                });
            }
            
            // 사용자 입력 대기
            console.log('\n⏸️  브라우저에서 페이지를 확인하고 Enter를 누르세요...');
            
            return analysis;

        } catch (error) {
            console.error(`❌ 분석 실패: ${error.message}`);
            return null;
        }
    }

    async close() {
        if (this.browser) {
            console.log('\n🔚 5초 후 브라우저 종료...');
            setTimeout(async () => {
                await this.browser.close();
            }, 5000);
        }
    }
}

// 실행
async function main() {
    const analyzer = new DaumDOMAnalyzer();
    
    try {
        await analyzer.init();
        await analyzer.analyzeDaumStructure();
    } catch (error) {
        console.error('❌ 분석 중 오류:', error);
    } finally {
        await analyzer.close();
    }
}

if (require.main === module) {
    main();
}