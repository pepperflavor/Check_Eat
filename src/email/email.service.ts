import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

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

  async sendVerificationCode(
    email: string,
    code: string,
    language: string,
    type: number,
  ) {
    const from = this.config.get<string>('SEND_GRID_SENDER_EMAIL');
    if (!from) {
      throw new Error('SEND_GRID_SENDER_EMAIL is not defined');
    }

    // 유저가 지정한 언어에 따라서 안내 메일 언어
    const supportedLanguages = ['ko', 'en', 'ja', 'zh'];

    let sendSubject = '';
    let sendHtml = '';

    // type : 0 == 회원가입시 이메일인증
    // type : 1 == 아이디찾기
    // type : 2  == 비밀번호 찾기
    switch (`${language}_${type}`) {
      case 'ko_0':
        sendSubject = 'CHECK EAT! 회원가입 인증코드';
        sendHtml = `<p> 아래 인증 코드를 인증 칸에 입력해주세요 : </p><h2>${code}</h2>`;
        break;

      case 'en_0':
        sendSubject = 'CHECK EAT! Membership registration authentication code';
        sendHtml = `<p> Please enter the authentication code below into the authentication field : </p><h2>${code}</h2>`;
        break;

      case 'ar_0':
        sendSubject = 'رمز مصادقة تسجيل العضوية "CHECK EAT!"';
        sendHtml = `<p> الرجاء إدخال رمز المصادقة أدناه في حقل المصادقة. </p><h2>${code}</h2>`;
        break;
      case 'ko_1':
        sendSubject = 'CHECK EAT! 아이디 찾기 인증코드';
        sendHtml = `<p> 아래 인증 코드를 인증 칸에 입력해주세요 : </p><h2>${code}</h2>`;
        break;
      case 'en_1':
        sendSubject = 'Find your "CHECK EAT" ID';
        sendHtml = `<p> Please enter the authentication code below into the authentication field : </p><h2>${code}</h2>`;
        break;
      case 'ar_1':
        sendSubject = 'ابحث عن معرف "CHECK EAT" الخاص بك';
        sendHtml = `<p> الرجاء إدخال رمز المصادقة أدناه في حقل المصادقة. </p><h2>${code}</h2>`;
        break;
      case 'ko_2':
        sendSubject = 'CHECK EAT! 비밀번호 인증코드';
        sendHtml = `<p> 아래 인증 코드를 인증 칸에 입력해주세요 : </p><h2>${code}</h2>`;
        break;
      case 'en_02':
        sendSubject = 'CHECK EAT! Password  Authentication Code';
        sendHtml = `<p> Please enter the authentication code below into the authentication field : </p><h2>${code}</h2>`;
        break;
      case 'ar_02':
        sendSubject = 'رمز مصادقة كلمة المرور CHECK EAT';
        sendHtml = `<p> الرجاء إدخال رمز المصادقة أدناه في حقل المصادقة. </p><h2>${code}</h2>`;
        break;
      default:
        break;
    }

    if (sendHtml.length == 0 || sendSubject.length == 0) {
      throw new Error('이메일 언어 설정중 에러가 발생되었습니다.');
    }

    const msg = {
      to: email,
      from: from,
      subject: sendSubject,
      html: sendHtml,
    };

    await sgMail.send(msg).catch((error) => {
      console.error('Error sending email:', error);
      throw new Error('Failed to send verification email');
    });
  }
}
