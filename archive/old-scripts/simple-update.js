
#!/usr/bin/env node

/**
 * KBO 데이터 전체 업데이트 (간단 버전)
 */

const KBODataScraper = require('./crawl-kbo-data.js');
const MagicNumberCalculator = require('./calculate-magic-numbers.js');
const HTMLUpdater = require('./update-html.js');

async function simpleUpdate() {
    try {
        console.log('🚀 KBO 데이터 전체 업데이트 시작...\n');
        
        // 1. KBO 순위 데이터 스크래핑
        console.log('1️⃣ 순위 데이터 스크래핑...');
        const scraper = new KBODataScraper();
        await scraper.updateKBOData();
        
        // 2. 매직넘버 계산
        console.log('\n2️⃣ 매직넘버 계산...');
        const calculator = new MagicNumberCalculator();
        await calculator.calculate();
        
        // 3. HTML 업데이트
        console.log('\n3️⃣ HTML 파일 업데이트...');
        const htmlUpdater = new HTMLUpdater();
        await htmlUpdater.updateAll();
        
        console.log('\n🎉 전체 업데이트 완료!');
        console.log(`⏰ 완료 시간: ${new Date().toLocaleString('ko-KR')}`);
        
    } catch (error) {
        console.error('❌ 업데이트 실패:', error.message);
        process.exit(1);
    }
}

// 실행
if (require.main === module) {
    simpleUpdate();
}

module.exports = simpleUpdate;
