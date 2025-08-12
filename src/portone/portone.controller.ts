// import {
//   Body,
//   Controller,
//   Get,
//   Post,
//   Query,
//   Req,
//   Res,
//   UseGuards,
// } from '@nestjs/common';
// import { PortoneService } from './portone.service';
// import { AuthGuard } from '@nestjs/passport';
// import { StartIdvDto } from './dto/start-idv-dto';
// import { ConfirmIdvDto } from './dto/confirm-idv-dto';
// import { ConfigService } from '@nestjs/config';
// import { Response } from 'express';

// @Controller('portone')
// export class PortoneController {
//   constructor(
//     private readonly portoneService: PortoneService,
//     private readonly config: ConfigService,
//   ) {}

//   @Post('start')
//   async start(@Body() body: StartIdvDto) {
//     return this.portoneService.start(body);
//   }

//   @Post('confirm')
//   async confirm(@Body() body: ConfirmIdvDto) {
//     return this.portoneService.confirm(body);
//   }

//   @Get('me')
//   @UseGuards(AuthGuard('jwt-idv'))
//   async me(@Req() req) {
//     const idv = await this.portoneService.findById(req.user.idvId);
//     return idv ?? {};
//   }

//   @Get('idv.html')
//   async idvPage(@Query('id') id: string, @Res() res: Response) {
//     const storeId = this.config.get<string>('PORTONE_STORE_ID')!;
//     const channelKey = this.config.get<string>('PORTONE_CHANNEL_KEY')!;
//     const redirectUrl = this.config.get<string>('IDV_REDIRECT_URL')!;

//     // Controller의 idvPage()에서 보내는 HTML 내용을 이걸로 교체
//     const html = `<!doctype html>
// <html>
// <head>
//   <meta charset="utf-8" />
//   <title>Identity Verification</title>
//   <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
//   <style>
//     html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',Arial,sans-serif}
//     #msg{padding:16px;text-align:center;white-space:pre-line}
//     code{background:#f5f5f5;padding:2px 6px;border-radius:4px}
//   </style>
// </head>
// <body>
//   <div id="msg">인증 화면을 불러오는 중...</div>
//   <script>
//     (function(){
//       const storeId = ${JSON.stringify(storeId)};
//       const channelKey = ${JSON.stringify(channelKey)};
//       const identityVerificationId = ${JSON.stringify(id || '')};
//       const redirectUrl = ${JSON.stringify(redirectUrl)};
//       const $ = id => document.getElementById(id);

//       function say(msg){ $('msg').textContent = msg; console.log('[IDV]', msg); }
//       function fail(reason){
//         console.error('[IDV] FAIL:', reason);
//         $('msg').innerHTML =
//           '포트원 SDK를 불러오지 못했습니다.\\n\\n' +
//           '사유: ' + reason + '\\n\\n' +
//           '1) https://cdn.iamport.kr/v1/iamport.js 접근 가능 여부\\n' +
//           '2) HTTPS(ngrok 등)에서 재시도\\n' +
//           '3) 애드블록/보안 확장 잠시 해제';
//       }
//       if(!identityVerificationId) return fail('identityVerificationId 누락');

//       const s = document.createElement('script');
//       s.src = 'https://cdn.iamport.kr/v1/iamport.js';
//       s.async = true;
//       s.onload = function(){
//         say('SDK 스크립트 로드됨');
//         try {
//           const hasPortOne = !!(window.PortOne && window.PortOne.requestIdentityVerification);
//           const hasIMP = !!(window.IMP && (window.IMP.requestIdentityVerification || window.IMP.certification));
//           console.log('hasPortOne:', hasPortOne, 'hasIMP:', hasIMP);

//           if (hasPortOne) {
//             say('PortOne 네임스페이스 사용');
//             window.PortOne.requestIdentityVerification({
//               storeId, identityVerificationId, channelKey, redirectUrl
//             });
//             say('인증 모듈을 여는 중...');
//           } else if (hasIMP) {
//             say('IMP 네임스페이스 사용');
//             if (window.IMP.init) try { window.IMP.init(storeId); } catch(e){}
//             const fn = window.IMP.requestIdentityVerification || window.IMP.certification;
//             const payload = window.IMP.requestIdentityVerification ? 
//               { storeId, identityVerificationId, channelKey, redirectUrl } :
//               { m_redirect_url: redirectUrl, custom_data: JSON.stringify({ identityVerificationId }) };
//             fn(payload, function(){});
//             say('인증 모듈을 여는 중...');
//           } else {
//             fail('전역 PortOne/IMP API 미정의');
//           }
//         } catch (e) {
//           fail('실행 오류: ' + (e && e.message ? e.message : e));
//         }
//       };
//       s.onerror = function(){ fail('iamport.js 로드 실패'); };
//       document.head.appendChild(s);
//     })();
//   </script>
// </body>
// </html>`;

//     res.setHeader(
//       'Content-Security-Policy',
//       [
//         "default-src 'self'",
//         "script-src 'self' https://cdn.iamport.kr 'unsafe-inline'",
//         "script-src-elem 'self' https://cdn.iamport.kr 'unsafe-inline'",
//         "script-src-attr 'self' 'unsafe-inline'",
//         "connect-src 'self' https://api.portone.io https://cdn.iamport.kr",
//         "img-src 'self' data: https://cdn.iamport.kr",
//         "style-src 'self' 'unsafe-inline'",
//         "frame-src 'self' https://*.portone.io https://*.iamport.kr",
//         "frame-ancestors 'self'",
//       ].join('; '),
//     );
//     res.setHeader('Content-Type', 'text/html; charset=utf-8');
//     return res.send(html);
//   }

//   // SDK로 웹뷰 띄워서 인증하기

//   @Post('start-sdk')
//   async startSdk(@Body() body: { method?: 'SMS' | 'APP' }) {
//     return this.portoneService.startSdk(body); // { id, webUrl }
//   }

//   @Get('echo')
//   echo(@Req() req) {
//     return { url: req.url, query: req.query };
//   }
// }
