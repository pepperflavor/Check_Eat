export function randomNickMaker(teamId: number, langue: string): string {
  const adjectives_ko: string[] = [
    '행복한',
    '슬픈',
    '화난',
    '지친',
    '활기찬',
    '조용한',
    '시끄러운',
    '따뜻한',
    '차가운',
    '부드러운',
    '강한',
    '약한',
    '빠른',
    '느린',
    '밝은',
    '어두운',
    '현명한',
    '용감한',
    '겸손한',
    '정직한',
    '친절한',
    '엄격한',
    '귀여운',
    '멋진',
    '신비로운',
    '공정한',
    '냉철한',
    '신중한',
    '논리적인',
    '객관적인',
    '분석적인',
    '통찰력있는',
    '예리한',
    '진지한',
    '사려깊은',
    '정의로운',
    '합리적인',
    '균형잡힌',
    '엄정한',
    '철저한',
  ];

  let firstNick = '';

  switch (teamId) {
    case 0:
      firstNick = '머글';
      break;
    case 1:
      firstNick = '턱돌이';
      break;
    case 2:
      firstNick = '랜디';
      break;
    case 3:
      firstNick = '윈지';
      break;
    case 4:
      firstNick = '빅';
      break;
    case 5:
      firstNick = '블레오';
      break;
    case 6:
      firstNick = '단디';
      break;
    case 7:
      firstNick = '철웅';
      break;
    case 8:
      firstNick = '럭키스타';
      break;
    case 9:
      firstNick = '호걸이';
      break;
    case 10:
      firstNick = '수리';
      break;

    default:
      firstNick = '머글';
      break;
  }

  const first = adjectives_ko[Math.floor(Math.random() * adjectives_ko.length)];
  const second = firstNick.length > 0 ? firstNick : '';

  return `${first} ${second}`;
}
