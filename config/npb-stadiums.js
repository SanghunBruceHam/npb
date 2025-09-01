/**
 * NPB 2025 팀별 홈구장 정보
 * 각 팀의 공식 홈구장과 가끔 사용하는 서브 구장 포함
 */

const npbStadiums = {
    // 센트럴 리그 (CL)
    '요미우리': {
        home: '도쿄돔',
        homeJP: '東京ドーム',
        city: '도쿄',
        capacity: 45600,
        league: 'CL',
        fullName: '요미우리 자이언츠',
        founded: 1934,
        colors: ['#F97316', '#000000'] // 오렌지, 검정
    },
    
    '한신': {
        home: '한신갑자원구장',  
        homeJP: '阪神甲子園球場',
        city: '니시노미야',
        capacity: 47508,
        league: 'CL',
        fullName: '한신 타이거스',
        founded: 1935,
        colors: ['#FFD700', '#000000'] // 노랑, 검정
    },
    
    'DeNA': {
        home: '요코하마스타디움',
        homeJP: '横浜スタジアム', 
        city: '요코하마',
        capacity: 34046,
        league: 'CL',
        fullName: '요코하마 DeNA 베이스타즈',
        founded: 1950,
        colors: ['#0066CC', '#FFFFFF'] // 파랑, 흰색
    },
    
    '히로시마': {
        home: '마츠다줌줌스타디움',
        homeJP: 'MAZDA Zoom-Zoom スタジアム広島',
        city: '히로시마',
        capacity: 33000,
        league: 'CL', 
        fullName: '히로시마 도요 카프',
        founded: 1950,
        colors: ['#DC143C', '#FFFFFF'] // 빨강, 흰색
    },
    
    '야쿠르트': {
        home: '메이지진구야구장',
        homeJP: '明治神宮野球場',
        city: '도쿄',
        capacity: 37933,
        league: 'CL',
        fullName: '도쿄 야쿠르트 스왈로즈', 
        founded: 1950,
        colors: ['#00A0B0', '#FFFFFF'] // 청록, 흰색
    },
    
    '중일': {
        home: '반테리나드나고야돔',
        homeJP: 'バンテリンドーム ナゴヤ',
        city: '나고야',
        capacity: 40500,
        league: 'CL',
        fullName: '중일 드래곤즈',
        founded: 1936,
        colors: ['#0047AB', '#FFFFFF'] // 파랑, 흰색
    },

    // 퍼시픽 리그 (PL)  
    '소프트뱅크': {
        home: '페이페이돔',
        homeJP: 'PayPayドーム',
        city: '후쿠오카',
        capacity: 40000,
        league: 'PL',
        fullName: '후쿠오카 소프트뱅크 호크스',
        founded: 1938,
        colors: ['#F8D022', '#000000'] // 노랑, 검정
    },
    
    '닛폰햄': {
        home: 'ES콘필드홋카이도',
        homeJP: 'エスコンフィールドHOKKAIDO', 
        city: '삿포로',
        capacity: 35000,
        league: 'PL',
        fullName: '홋카이도 닛폰햄 파이터즈',
        founded: 1946,
        colors: ['#00BFFF', '#C0C0C0'] // 하늘색, 은색
    },
    
    '로데': {
        home: 'ZOZOMARINE스타디움',
        homeJP: 'ZOZOマリンスタジアム',
        city: '지바',
        capacity: 30118,
        league: 'PL', 
        fullName: '지바 롯데 마린즈',
        founded: 1950,
        colors: ['#000080', '#C0C0C0'] // 네이비, 은색
    },
    
    '라쿠텐': {
        home: '라쿠텐생명파크미야기',
        homeJP: '楽天生命パーク宮城',
        city: '센다이', 
        capacity: 28005,
        league: 'PL',
        fullName: '도호쿠 라쿠텐 골든이글스',
        founded: 2005,
        colors: ['#8B0000', '#FFD700'] // 진빨강, 금색
    },
    
    '오릭스': {
        home: '교세라돔오사카',
        homeJP: '京セラドーム大阪',
        city: '오사카',
        capacity: 36477,
        league: 'PL',
        fullName: '오릭스 버팔로즈', 
        founded: 1936,
        colors: ['#000000', '#FFD700'] // 검정, 금색
    },
    
    '세이부': {
        home: '벨루나돔',
        homeJP: 'ベルーナドーム',
        city: '사이타마',
        capacity: 33556,
        league: 'PL',
        fullName: '사이타마 세이부 라이온즈',
        founded: 1950,
        colors: ['#0047AB', '#FFFFFF'] // 파랑, 흰색
    }
};

// 구장별 홈팀 매핑 (역매핑)
const stadiumToTeam = {};
Object.keys(npbStadiums).forEach(team => {
    const stadium = npbStadiums[team].home;
    const stadiumJP = npbStadiums[team].homeJP;
    stadiumToTeam[stadium] = team;
    stadiumToTeam[stadiumJP] = team;
});

// 리그별 팀 분류
const leagueTeams = {
    central: Object.keys(npbStadiums).filter(team => npbStadiums[team].league === 'CL'),
    pacific: Object.keys(npbStadiums).filter(team => npbStadiums[team].league === 'PL')
};

// 지역별 분류
const regionTeams = {
    kanto: ['요미우리', 'DeNA', '야쿠르트', '로데', '세이부'], // 간토
    kansai: ['한신', '오릭스'], // 간사이 
    chubu: ['중일'], // 중부
    chugoku: ['히로시마'], // 주고쿠
    kyushu: ['소프트뱅크'], // 큐슈
    tohoku: ['라쿠텐'], // 도호쿠
    hokkaido: ['닛폰햄'] // 홋카이도
};

module.exports = {
    npbStadiums,
    stadiumToTeam, 
    leagueTeams,
    regionTeams
};