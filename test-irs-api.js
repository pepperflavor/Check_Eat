// 국세청 API 직접 테스트 스크립트
const axios = require('axios');

async function testIrsApi() {
  const IRS_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/validate';
  const SERVICE_KEY = 'cyVqKnFFvKISoeK6jhnr24mP9bjdZhWT8y9LWpSGLkSnjoZk2aYqUpoTcvYGzhNa47HxAOOcJkTwzmQXiZZe5w%3D%3D';
  
  const payload = {
    businesses: [
      {
        b_no: "6678200245",
        start_dt: "20180302",
        p_nm: "변운섭"
      }
    ]
  };

  const requestUrl = `${IRS_URL}?serviceKey=${SERVICE_KEY}&returnType=JSON`;
  
  console.log('=== 테스트 시작 ===');
  console.log('요청 URL:', requestUrl);
  console.log('요청 데이터:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(requestUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });

    console.log('=== 성공 응답 ===');
    console.log('상태 코드:', response.status);
    console.log('응답 헤더:', response.headers);
    console.log('응답 데이터:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('=== 오류 발생 ===');
    console.log('오류 메시지:', error.message);
    console.log('오류 코드:', error.code);
    
    if (error.response) {
      console.log('응답 상태:', error.response.status);
      console.log('응답 헤더:', error.response.headers);
      console.log('응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testIrsApi();