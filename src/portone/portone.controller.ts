import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PortoneService } from './portone.service';
import { AuthGuard } from '@nestjs/passport';
import { StartIdvDto } from './dto/start-idv-dto';
import { ConfirmIdvDto } from './dto/confirm-idv-dto';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('portone')
export class PortoneController {
  constructor(
    private readonly portoneService: PortoneService,
    private readonly config: ConfigService,
  ) {}

  @Post('start')
  async start(@Body() body: StartIdvDto) {
    return this.portoneService.start(body);
  }

  @Post('confirm')
  async confirm(@Body() body: ConfirmIdvDto) {
    return this.portoneService.confirm(body);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt-idv'))
  async me(@Req() req) {
    const idv = await this.portoneService.findById(req.user.idvId);
    return idv ?? {};
  }

  // controller: GET /portone/idv.html
  @Get('idv.html')
  async idvPage(@Query('id') id: string, @Res() res: Response) {
    const storeId = this.config.get<string>('PORTONE_STORE_ID')!;
    const channelKey = this.config.get<string>('PORTONE_CHANNEL_KEY')!;
    const redirectUrl = this.config.get<string>('IDV_REDIRECT_URL')!;

    // CSP (테스트용 완화. 운영에서는 nonce 기반 권장)
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' https://cdn.portone.io 'unsafe-inline'",
        "script-src-elem 'self' https://cdn.portone.io 'unsafe-inline'",
        "script-src-attr 'self' 'unsafe-inline'",
        "connect-src 'self' https://api.portone.io https://cdn.portone.io",
        "img-src 'self' data: https://cdn.portone.io",
        "style-src 'self' 'unsafe-inline'",
        "frame-src 'self' https://*.portone.io https://*.iamport.kr",
        "frame-ancestors 'self'",
      ].join('; '),
    );

    const html = `<!doctype html><html><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Identity Verification</title>
    <script src="https://cdn.portone.io/v2/browser-sdk.js"></script>
    <style>html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',Arial,sans-serif}#msg{padding:16px}</style>
  </head><body>
    <div id="msg">인증 화면을 불러오는 중...</div>
    <script>
    (function(){
      const storeId=${JSON.stringify(storeId)};
      const channelKey=${JSON.stringify(channelKey)};
      const identityVerificationId=${JSON.stringify(id || '')};
      const redirectUrl=${JSON.stringify(redirectUrl)};
      const msg=(t)=>document.getElementById('msg').textContent=t;

      if(!identityVerificationId){ msg('identityVerificationId 누락'); return; }
      function boot(){
        if(!window.PortOne||!window.PortOne.requestIdentityVerification){
          msg('포트원 V2 SDK를 불러오지 못했습니다.'); return;
        }
        msg('인증 모듈을 여는 중...');
        window.PortOne.requestIdentityVerification({
          storeId, identityVerificationId, channelKey, redirectUrl
        });
      }
      if(document.readyState==='complete') boot();
      else window.addEventListener('load', boot);
    })();
    </script>
  </body></html>`;
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        // 브라우저 SDK
        "script-src 'self' https://cdn.portone.io 'unsafe-inline'",
        "script-src-elem 'self' https://cdn.portone.io 'unsafe-inline'",
        "script-src-attr 'self' 'unsafe-inline'",

        // ❗️SDK가 호출/통신하는 도메인들(추가 핵심)
        "connect-src 'self' https://api.portone.io https://cdn.portone.io https://*.portone.io https://checkout-service.prod.iamport.co",

        // 리소스/프레임
        "img-src 'self' data: https://cdn.portone.io https://*.portone.io",
        "style-src 'self' 'unsafe-inline'",
        "frame-src 'self' https://*.portone.io https://*.iamport.kr https://*.iamport.co https://checkout-service.prod.iamport.co",

        "frame-ancestors 'self'",
      ].join('; '),
    );
    return res.send(html);
  }

  // SDK로 웹뷰 띄워서 인증하기

  @Post('start-sdk')
  async startSdk(@Body() body: { method?: 'SMS' | 'APP' }) {
    return this.portoneService.startSdk(body); // { id, webUrl }
  }

  @Get('echo')
  echo(@Req() req) {
    return { url: req.url, query: req.query };
  }

  @Post('complete')
  async complete(@Body() body: { identityVerificationId: string }) {
    return this.portoneService.complete(body.identityVerificationId);
  }
}
