// NPB 팀 정보 설정 파일
// 2025 시즌 기준

const npbTeams = {
  // 센트럴 리그 (Central League)
  central: {
    "요미우리": { 
      fullName: "요미우리 자이언츠", 
      englishName: "Yomiuri Giants",
      color: "#F97709", 
      league: "CL",
      stadium: "도쿄 돔",
      logo: 'images/central/yomiuri.png'
    },
    "한신": { 
      fullName: "한신 타이거스", 
      englishName: "Hanshin Tigers",
      color: "#FFE201", 
      league: "CL",
      stadium: "한신 고시엔 구장",
      logo: 'images/central/hanshin.png'
    },
    "중일": { 
      fullName: "중일 드래곤즈", 
      englishName: "Chunichi Dragons",
      color: "#002C5B", 
      league: "CL",
      stadium: "반테린 돔 나고야",
      logo: 'images/central/chunichi.png'
    },
    "야쿠르트": { 
      fullName: "야쿠르트 스왈로즈", 
      englishName: "Tokyo Yakult Swallows",
      color: "#008B45", 
      league: "CL",
      stadium: "진구 구장",
      logo: 'images/central/yakult.png'
    },
    "DeNA": { 
      fullName: "요코하마 DeNA 베이스타즈", 
      englishName: "Yokohama DeNA BayStars",
      color: "#005BAB", 
      league: "CL",
      stadium: "요코하마 스타디움",
      logo: 'images/central/dena.png'
    },
    "히로시마": { 
      fullName: "히로시마 토요 카프", 
      englishName: "Hiroshima Toyo Carp",
      color: "#BE0026", 
      league: "CL",
      stadium: "마쓰다 Zoom-Zoom 스타디움",
      logo: 'images/central/hiroshima.png'
    }
  },

  // 퍼시픽 리그 (Pacific League)  
  pacific: {
    "소프트뱅크": { 
      fullName: "후쿠오카 소프트뱅크 호크스", 
      englishName: "Fukuoka SoftBank Hawks",
      color: "#F8D022", 
      league: "PL",
      stadium: "PayPay 돔",
      logo: 'images/pacific/softbank.png'
    },
    "로데": { 
      fullName: "지바 로데 마린즈", 
      englishName: "Chiba Lotte Marines",
      color: "#000000", 
      league: "PL",
      stadium: "ZOZO 마린 스타디움",
      logo: 'images/pacific/lotte.png'
    },
    "오릭스": { 
      fullName: "오릭스 버팔로즈", 
      englishName: "Orix Buffaloes",
      color: "#B51E36", 
      league: "PL",
      stadium: "교세라 돔 오사카",
      logo: 'images/pacific/orix.png'
    },
    "라쿠텐": { 
      fullName: "토호쿠 라쿠텐 골든 이글스", 
      englishName: "Tohoku Rakuten Golden Eagles",
      color: "#7E0428", 
      league: "PL",
      stadium: "라쿠텐 생명 파크 미야기",
      logo: 'images/pacific/rakuten.png'
    },
    "닛폰햄": { 
      fullName: "홋카이도 닛폰햄 파이터즈", 
      englishName: "Hokkaido Nippon-Ham Fighters",
      color: "#2E5985", 
      league: "PL",
      stadium: "ES CON 필드 홋카이도",
      logo: 'images/pacific/nipponham.png'
    },
    "세이부": { 
      fullName: "사이타마 세이부 라이온즈", 
      englishName: "Saitama Seibu Lions",
      color: "#1B3B8B", 
      league: "PL",
      stadium: "베르나 돔",
      logo: 'images/pacific/seibu.png'
    }
  }
};

// 팀 검색 헬퍼 함수들
const npbTeamUtils = {
  // 모든 팀 정보 반환
  getAllTeams() {
    return { ...npbTeams.central, ...npbTeams.pacific };
  },

  // 리그별 팀 정보 반환
  getLeagueTeams(league) {
    return league === 'CL' ? npbTeams.central : npbTeams.pacific;
  },

  // 팀명으로 정보 검색
  getTeamInfo(teamName) {
    const allTeams = this.getAllTeams();
    return allTeams[teamName] || null;
  },

  // 리그명 반환
  getTeamLeague(teamName) {
    const teamInfo = this.getTeamInfo(teamName);
    return teamInfo ? teamInfo.league : null;
  },

  // 센트럴 리그 팀 목록
  getCentralTeams() {
    return Object.keys(npbTeams.central);
  },

  // 퍼시픽 리그 팀 목록  
  getPacificTeams() {
    return Object.keys(npbTeams.pacific);
  }
};

// Node.js와 브라우저 환경 모두 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { npbTeams, npbTeamUtils };
} else {
  window.npbTeams = npbTeams;
  window.npbTeamUtils = npbTeamUtils;
}