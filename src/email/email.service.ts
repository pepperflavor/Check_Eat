import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}
  onModuleInit() {
    const apiKEY = this.config.get<string>('SEND_GRID_MAILER_API_KEY');
    if (apiKEY) {
      sgMail.setApiKey(apiKEY);
    } else {
      throw new Error('SEND_GRID_MAILER_API_KEY is not defined');
    }
  }

  async sendVerificationCode(email: string, code: string, language: string) {
    const from = this.config.get<string>('SEND_GRID_SENDER_EMAIL');
    if (!from) {
      throw new Error('SEND_GRID_SENDER_EMAIL is not defined');
    }

    // 유저가 지정한 언어에 따라서 안내 메일 언어
    const supportedLanguages = ['ko', 'en', 'ja', 'zh'];

    const msg = {
      to: email,
      from: from,
      subject: 'CHECK EAT! 회원가입 인증코드',
      html: `<p>아래 인증 코드를 회원가입 창에 입력해주세요 : </p><h2>${code}</h2>`,
    };

    await sgMail.send(msg).catch((error) => {
      console.error('Error sending email:', error);
      throw new Error('Failed to send verification email');
    });
  }
}
