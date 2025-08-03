import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';
import { RegistFoodReviewDto } from './dto/regist-food-review.dto';
import { ReviewStorageService } from '../azure-storage/review-storage.service';
import { stat } from 'fs';
import { TranslateService } from 'src/translate/translate.service';

@Injectable()
export class ReviewService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reviewStorageService: ReviewStorageService,
    private readonly translateService: TranslateService,
  ) {}

  // 우리 어플에 등록된 가게 맞는지 확인
  // 일단 영수증 발급날짜로부터 제한은 아직 없음
  async checkRegistStore(address: string, storeName: string) {
    // 가게명 또는 주소 일치하는게 있는지 확인
    const triemAdd = address.trim();
    const trimStName = storeName.trim();
    const result = await this.prisma.store.findFirst({
      where: {
        // sto_status : { not: 2 }, // 완전 제외할지 말지..?
        OR: [{ sto_name: trimStName }, { sto_address: triemAdd }],
      },
      select: {
        sto_status: true,
        sto_id: true,
      },
    });

    if (!result) {
      return {
        message: '가게를 조회할 수 없습니다.',
        status: 'false',
      };
    }

    if (result?.sto_status == 2) {
      return {
        message: '폐업한 가게입니다. 리뷰를 작성할 수 없습니다',
        status: 'false',
      };
    }

    return {
      message: '리뷰등록 가능',
      status: 'success',
      sto_id: result.sto_id,
    };
  }

  // 리뷰페이지에서 뿌려줄 한가게 음식들 리스트
  // 언어별 데이터 다르게 뽑아줌
  async oneStoreFoodsList(sto_id: number, lang: string) {
    const foods = await this.prisma.food.findMany({
      where: {
        Store: {
          some: {
            sto_id,
          },
        },
        foo_status: 0, // 판매중인 음식만
      },
      select: {
        foo_id: true,
        foo_price: true,
        foo_img: true,
        foo_name: lang === 'ko', // 'ko'일 때만 기본 name 포함
        food_translate_en:
          lang === 'en'
            ? {
                select: {
                  ft_en_name: true,
                },
              }
            : false,
        food_translate_ar:
          lang === 'ar'
            ? {
                select: {
                  ft_ar_name: true,
                },
              }
            : false,
      },
    });

    // 언어에 따라 이름 필드를 통일
    const result = foods.map((food) => {
      let name = food.foo_name;
      if (lang === 'en' && food.food_translate_en?.ft_en_name) {
        name = food.food_translate_en.ft_en_name;
      } else if (lang === 'ar' && food.food_translate_ar?.ft_ar_name) {
        name = food.food_translate_ar.ft_ar_name;
      }

      return {
        foo_id: food.foo_id,
        foo_price: food.foo_price,
        foo_img: food.foo_img,
        foo_name: name,
      };
    });

    return result;
  }

  // 입력 언어에 따른 번역 언어 세팅해주는 유틸
  private getFromToLanguages(userLang: string): {
    from: string;
    to: string[];
  } {
    switch (userLang) {
      case 'ko':
        return { from: 'ko', to: ['en', 'ar'] };
      case 'en':
        return { from: 'en', to: ['ko', 'ar'] };
      case 'ar':
        return { from: 'ar', to: ['ko', 'en'] };
      default:
        return { from: 'ko', to: ['en', 'ar'] }; // fallback
    }
  }

  // 유저 리뷰 등록
  async userRegistReview(
    ld_log_Id: string,
    reviData: RegistFoodReviewDto,
    files?: Express.Multer.File[],
    lang: string = 'ko',
  ) {
    // 메뉴 이름들, 추천 여부, 사진, 텍스트
    // 당장 리뷰 등록 안할거면 저장되도록 해야함
    // 유저 테이블 관계 연결 필요
    // 사진 애저에 저장해야함

    // 애저에 올린다음 얻을
    let imageUrls: string[] = [];

    if (
      reviData.revi_reco_step === 2 &&
      (!reviData.revi_content || reviData.revi_content.length === 0)
    ) {
      return {
        message: '[Review]추천을 하지 않으면 이유를 적어야 합니다.',
        status: 'false',
      };
    }
    // 리뷰 번역해서 저장하기

    // 이미지가 있으면 Azure에 업로드
    if (files && files.length > 0) {
      imageUrls = await this.reviewStorageService.uploadReviewImages(files);
    }

    const userId = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: ld_log_Id,
      },
      select: {
        ld_user_id: true,
      },
    });

    if (!userId || !userId.ld_user_id) {
      return {
        message: '[Review]유저 아이디를 찾을 수 없습니다.',
        status: 'false',
      };
    }

    // DB에 리뷰 저장
    const review = await this.prisma.review.create({
      data: {
        revi_reco_step: reviData.revi_reco_step,
        revi_content: reviData.revi_content || null,
        revi_status: reviData.revi_status || 0,
        user_id: userId.ld_user_id,
        store_id: reviData.store_id,
        foods: {
          connect: reviData.food_ids.map((id) => ({ foo_id: id })),
        },
      },
      include: {
        foods: true,
        user: true,
        store: true,
      },
    });

    if (review.revi_content && review.revi_content.length > 0) {
      try {
        const { from, to } = this.getFromToLanguages(lang); // ✅ 유저 언어 기준으로 설정
        const translated = await this.translateService.translateMany(
          review.revi_content,
          to,
          from,
        );

        for (const translation of translated[0]?.translations || []) {
          const { to: langCode, text } = translation;

          if (langCode === 'en') {
            await this.prisma.reviewTranslateEN.upsert({
              where: { revi_id: review.revi_id },
              update: { rt_content_en: text },
              create: {
                rt_content_en: text,
                revi_id: review.revi_id,
              },
            });
          }

          if (langCode === 'ar') {
            await this.prisma.reviewTranslateAR.upsert({
              where: { revi_id: review.revi_id },
              update: { rt_ar_content: text },
              create: {
                rt_ar_content: text,
                revi_id: review.revi_id,
              },
            });
          }
        }
      } catch (err) {
        console.error('[Review] 리뷰 번역 실패:', err);
      }
    }
    // 이미지 URL들을 ReviewImage 테이블에 저장
    if (imageUrls.length > 0) {
      const reviewImages = imageUrls.map((url) => ({
        revi_img_url: url,
        review_id: review.revi_id,
      }));

      await this.prisma.reviewImage.createMany({
        data: reviewImages,
      });
    }

    return {
      message: '리뷰가 성공적으로 등록되었습니다.',
      review_id: review.revi_id,
      uploaded_images: imageUrls.length,
    };
  }
}
