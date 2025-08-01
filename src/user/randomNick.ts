export function randomNickMaker(language: string): string {
  const adjectives = {
    ko: [
      '행복한', '슬픈', '화난', '지친', '활기찬', '조용한', '시끄러운', '따뜻한', '차가운', '부드러운',
      '강한', '약한', '빠른', '느린', '밝은', '어두운', '용감한', '겸손한', '정직한',
      '친절한', '엄격한', '귀여운', '멋진',
    ],
    en: [
      'happy', 'sad', 'angry', 'tired', 'energetic', 'quiet', 'noisy', 'warm', 'cold', 'soft',
      'strong', 'weak', 'fast', 'slow', 'bright', 'dark', 'brave', 'humble', 'honest',
      'kind', 'strict', 'cute', 'cool',
    ],
    ar: [
      'سعيد', 'حزين', 'غاضب', 'متعب', 'نشيط', 'هادئ', 'صاخب', 'دافئ', 'بارد', 'ناعم',
      'قوي', 'ضعيف', 'سريع', 'بطيء', 'مضيء', 'مظلم', 'شجاع', 'متواضع', 'صادق',
      'لطيف', 'صارم', 'لطيف الشكل', 'رائع',
    ]
  };

  const nicknames = {
    ko: [
      '토마토', '당근', '양파', '사과', '감자', '브로콜리', '버섯', '망고', '민트', '오렌지',
    ],
    en: [
      'Tomato', 'Carrot', 'Onion', 'Apple', 'Potato', 'Broccoli', 'Mushroom', 'Mango', 'Mint', 'Orange',
    ],
    ar: [
      'طماطم', 'جزر', 'بصل', 'تفاحة', 'بطاطا', 'بروكلي', 'فطر', 'مانجو', 'نعناع', 'برتقالة',
    ]
  };

  const lang = ['ko', 'en', 'ar'].includes(language) ? language : 'ko';
  const adjList = adjectives[lang];
  const nickList = nicknames[lang];

  const adj = adjList[Math.floor(Math.random() * adjList.length)];
  const nick = nickList[Math.floor(Math.random() * nickList.length)];

  return `${adj} ${nick}`;
}