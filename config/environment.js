// NPB 프로젝트 환경 설정 파일

const npbConfig = {
  // 프로젝트 기본 정보
  project: {
    name: "NPB 매직넘버 계산기",
    version: "1.0.0",
    description: "2025 일본프로야구 리그 실시간 매직넘버 & 클라이맥스 시리즈 분석",
    author: "SanghunBruceHam",
    homepage: "https://sanghunbruceham.github.io/npb",
    repository: "https://github.com/SanghunBruceHam/npb"
  },

  // NPB 시즌 설정
  season: {
    year: 2025,
    totalGames: {
      regular: 143,      // 리그 내 경기
      interleague: 18    // 교류전 경기
    },
    totalSeasonGames: 161,  // 총 경기 수
  },

  // 클라이맥스 시리즈 설정
  climaxSeries: {
    firstStage: {
      teams: 2,           // 2위 vs 3위
      format: "3게임 2승제",
      gamesNeeded: 2,
      maxGames: 3
    },
    finalStage: {
      teams: 2,           // 1위 vs 1단계 승자
      format: "6게임 4승제",
      gamesNeeded: 4,
      maxGames: 6,
      advantage: 1        // 1위팀 1승 어드밴티지
    }
  },

  // 데이터 경로 설정
  paths: {
    data: "./data/",
    images: "./images/",
    css: "./css/",
    js: "./js/",
    crawlers: "./crawlers/",
    docs: "./docs/",
    kboReference: "./kbo-reference/"
  }
};

// Node.js와 브라우저 환경 모두 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { npbConfig };
} else {
  window.npbConfig = npbConfig;
}