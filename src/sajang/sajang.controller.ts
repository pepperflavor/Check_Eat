import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SajangService } from './sajang.service';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { BusinessRegistrationDTO } from './sajang_dto/business_registration.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { RegistFoodDto } from './sajang_dto/regist-food.dto';
import { updateStoreDataDto } from './sajang_dto/update-store-data.dto';
import { DeleteFoodDto } from './sajang_dto/delete-food-dto';
import { SajangStoDto } from './sajang_dto/mypage.dto';
import { HolidayDto } from './sajang_dto/regist-holiday.sto';

@Controller('sajang')
export class SajangController {
  constructor(private readonly sajangService: SajangService) {}

  // 음식 등록
  @Post('regist-food')
  @UseGuards(JwtAuthGuard)
  async registFood(@Req() req, @Body() body: RegistFoodDto) {
    const sa_id = Number(req.user.sa_id);

    return await this.sajangService.registFood(sa_id, {
      foo_id: Number(body.foo_id),
      foo_name: body.foo_name,
      foo_price: body.foo_price, // string | number 허용
      foo_vegan:
        body.foo_vegan !== undefined ? Number(body.foo_vegan) : undefined,
    });
  }

  @Post('update-store-data')
  @UseGuards(JwtAuthGuard)
  async updateStoreData(@Req() req, @Body() body: updateStoreDataDto) {
    const sa_id = Number(req.user.sa_id);
    return await this.sajangService.updateStoreData(sa_id, body);
  }

  // 음식 삭제
  @Post('delete-food')
  @UseGuards(JwtAuthGuard)
  async deleteFood(@Req() req, @Body() body: DeleteFoodDto) {
    const sa_id = Number(req.user.sa_id); // 사장 아이디 추출, 본인 업장인지 확인후 데이터 처리

    return await this.sajangService.deleteOneFood(sa_id, Number(body.foo_id));
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

  // 사장님 홈 - 리뷰데이터 보내주기
  // 여기도 가게 아이디 받는거 추가해야함
  @Post('home')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '사장님 홈 화면 진입',
    description: '사장님 홈 리뷰, 할랄여부',
  })
  async sajangHome(@Req() req, @Body() body: SajangStoDto) {
    const ld_log_id = req.user.sub;
    return await this.sajangService.sajangHome(ld_log_id, body?.sto_id);
  }

  //------------ 사장님 마이페이지 관련
  // 마이페이지 진입
  @Post('mypage')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '사장님 마이페이지 진입',
    description: '인증 상태 + 본인 소유 가게 ID +  목록',
  })
  async sajangMyPage(@Req() req) {
    const sa_id = Number(req.user.sa_id);
    return await this.sajangService.sajangEnterMypage(sa_id);
  }

  // 가게 대표 이미지 수정
  // 가게 아이디 필요
  @Post('update-board-img')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    description: '가게 대표이미지 업데이트, 이미지 하나만 업로드함',
  })
  @ApiBody({ type: 'multipart/form-data' })
  @ApiConsumes('multipart/form-data')
  async updateBoard(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SajangStoDto,
  ) {
    const ld_log_id = req.user.sub;
    return await this.sajangService.updateStoreImg(
      ld_log_id,
      file,
      body?.sto_id,
    );
  }

  // 휴무일 데이터 입력받기
  @Post('regist-holiday')
  async registHoli(@Req() req, @Body() body: HolidayDto) {}

  // 가게 메뉴 관리
  @Post('update-food')
  async updateFoodStatus(@Req() req, @Body() body) {}

  // 사업자 등록증 관리 페이지
  @Post('update-business')
  async updateBusiness(@Req() req, @Body() body) {}
}
