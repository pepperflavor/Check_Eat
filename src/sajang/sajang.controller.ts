import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { SajangService } from './sajang.service';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { BusinessRegistrationDTO } from './sajang_dto/business_registration.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('sajang')
export class SajangController {
  constructor(private readonly sajangService: SajangService) {}

  //==== 음식 사진 찍으면 재료명 추출해 주기
  @Post('recommend-meterials')
  async recommendMeterials() {
    return await this.sajangService.recommendMeterials();
  }

  // 음식 등록
  @Post('regist-food')
  async registFood() {
    return await this.sajangService.registFood();
  }

  // 음식 삭제
  @Post('delete-food')
  @UseGuards(JwtAuthGuard)
  async deleteFood(@Req() req) {
    const ID = req.user.sub; // 사장 아이디 추출, 본인 업장인지 확인후 데이터 처리
  }

  // 할랄 업장 인증
  @Post('regist-halal')
  async registHalal() {}

  // 회원가입시 사업자 등록증 등록
  @Post('regist-certification')
  @ApiOperation({
    summary: '사장님이 정보 수정후 취합해서 요청보내기',
    description:
      '사업자 등록 진위여부 - 국세청으로 요청보내는 곳/ ocr인식, 정보 수정 후 보내는곳',
  })
  async registCertification(@Body() body: BusinessRegistrationDTO) {
    // 사장님아이디 토큰말고, body에 같이 받음
    const result = await this.sajangService.checkBusinessRegistration(body);
    return result;
  }

  // 마이페이지에서 사업자등록증 재 인증
  // @Post('check-business-registration')
  // async checkBusinessRegistration() {}

  // 가게 영업 종료 수정
  // 업체 삭제
  @Post('delete-store')
  @ApiOperation({ summary: '가게 삭제', description: '가게삭제' })
  @UseGuards(JwtAuthGuard)
  async deleteStore(@Req() req) {
    const sa_id = req.user.sa_id;
    const result = await this.sajangService.editStoreState(sa_id, 2);
    return result;
  }

  // 사장님 홈
  @Post('home')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '사장님 홈 화면 진입', description:'사장님 홈 리뷰, 할랄여부' })
  async sajangHome(@Req() req) {
    const ld_log_id = req.user.sub;
    return await this.sajangService.sajangHome(ld_log_id);
  }

  @Post('mypage')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '사장님 마이페이지 진입',
    description: '사장님 마이페이지, 일단은 가게 첫번쨰거로 데이터 뽑음',
  })
  async sajangMyPage(@Req() req) {
    const ld_log_id = req.user.sub;
    return await this.sajangService.sajangHome(ld_log_id);
  }

  @Post('update-board-img')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ description: '가게 대표이미지 업데이트, 이미지 하나만 업로드함' })
  @ApiBody({ type: 'multipart/form-data' }) 
  @ApiConsumes('multipart/form-data')
  async updateBoard(@Req() req, @UploadedFile() file: Express.Multer.File,) {
    const ld_log_id = req.user.sub;
    return await this.sajangService.updateStoreImg(ld_log_id, file);
  }
}
