
#!/usr/bin/env node

/**
 * HTML 파일에 최신 KBO 데이터 반영
 */

const fs = require('fs');
const path = require('path');

class HTMLUpdater {
    constructor() {
        this.htmlFiles = [
            './index.html',
            './magic-number/index.html'
        ];
    }

    loadKBOData() {
        try {
            const data = fs.readFileSync('./kbo-rankings.json', 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ KBO 데이터 로드 실패:', error.message);
            return null;
        }
    }

    generateRankingHTML(rankings) {
        return rankings.map(team => 
            `<tr>
                <td class="rank">${team.rank}</td>
                <td class="team">${team.team}</td>
                <td>${team.games}</td>
                <td class="wins">${team.wins}</td>
                <td class="losses">${team.losses}</td>
                <td>${team.draws}</td>
                <td class="win-rate">${team.winRate.toFixed(3)}</td>
                <td>${team.gamesBehind}</td>
            </tr>`
        ).join('\n');
    }

    generateMagicNumberHTML(magicNumbers) {
        const teams = Object.keys(magicNumbers);
        return teams.map(team => {
            const magic = magicNumbers[team];
            return `<tr>
                <td class="team">${team}</td>
                <td class="magic-playoff">${magic.playoff === 999 ? '-' : magic.playoff}</td>
                <td class="magic-championship">${magic.championship === 999 ? '-' : magic.championship}</td>
                <td class="remaining">${magic.remainingGames || 0}</td>
            </tr>`;
        }).join('\n');
    }

    updateHTML(filePath, data) {
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ 파일 없음: ${filePath}`);
                return;
            }

            let html = fs.readFileSync(filePath, 'utf8');
            
            // 마지막 업데이트 시간 반영
            const updateTime = new Date(data.lastUpdated).toLocaleString('ko-KR');
            html = html.replace(
                /마지막 업데이트:.*?<\/.*?>/g,
                `마지막 업데이트: ${updateTime}</span>`
            );
            
            // 순위표 데이터 업데이트
            const rankingHTML = this.generateRankingHTML(data.rankings);
            html = html.replace(
                /<!-- RANKING_DATA_START -->[\s\S]*?<!-- RANKING_DATA_END -->/,
                `<!-- RANKING_DATA_START -->\n${rankingHTML}\n<!-- RANKING_DATA_END -->`
            );
            
            // 매직넘버 테이블 업데이트
            if (data.magicNumbers) {
                const magicHTML = this.generateMagicNumberHTML(data.magicNumbers);
                html = html.replace(
                    /<!-- MAGIC_NUMBER_START -->[\s\S]*?<!-- MAGIC_NUMBER_END -->/,
                    `<!-- MAGIC_NUMBER_START -->\n${magicHTML}\n<!-- MAGIC_NUMBER_END -->`
                );
            }

            
            // 파일 저장
            fs.writeFileSync(filePath, html, 'utf8');
            console.log(`✅ HTML 업데이트 완료: ${filePath}`);
            
        } catch (error) {
            console.error(`❌ HTML 업데이트 실패 (${filePath}):`, error.message);
        }
    }

    async updateAll() {
        console.log('🖥️ HTML 파일 업데이트 시작...\n');
        
        const data = this.loadKBOData();
        if (!data) {
            console.log('⚠️ KBO 데이터가 없어 HTML 업데이트를 건너뜁니다.');
            return;
        }
        
        this.htmlFiles.forEach(filePath => {
            this.updateHTML(filePath, data);
        });
        
        console.log('\n🎉 모든 HTML 파일 업데이트 완료!');
    }
}

// 실행
async function main() {
    const updater = new HTMLUpdater();
    await updater.updateAll();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = HTMLUpdater;
