import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';
import { RegistFoodReviewDto } from './dto/regist-food-review.dto';
import { ReviewStorageService } from '../azure-storage/review-storage.service';
import { stat } from 'fs';
import { TranslateService } from 'src/translate/translate.service';
import { WriteLaterReviewDto } from './dto/write-later-review.dto';
import { FoodWithOptionalTranslation } from './type/foodTranstype';

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
  // 언어별 필요한 번역 테이블만 select
  let translationSelect = {};
  if (lang === 'en') {
    translationSelect = {
      food_translate_en: {
        select: { ft_en_name: true, ft_en_mt: true },
      },
    };
  } else if (lang === 'ar') {
    translationSelect = {
      food_translate_ar: {
        select: { ft_ar_name: true, ft_ar_mt: true },
      },
    };
  }

  // Prisma 조회
  const foods = await this.prisma.food.findMany({
    where: {
      Store: { some: { sto_id } },
      foo_status: 0, // 판매중인 음식만
    },
    select: {
      foo_id: true,
      foo_price: true,
      foo_img: true,
      foo_name: true,       // 기본 이름
      foo_material: true,   // 기본 재료
      ...translationSelect, // 언어별 번역만 조인
    },
  }) as FoodWithOptionalTranslation[];

  // 결과 매핑
  return foods.map((food) => {
    let name = food.foo_name;
    let material = food.foo_material;

    if (lang === 'en' && food.food_translate_en) {
      name = food.food_translate_en.ft_en_name || name;
      material = food.food_translate_en.ft_en_mt || material;
    } else if (lang === 'ar' && food.food_translate_ar) {
      name = food.food_translate_ar.ft_ar_name || name;
      material = food.food_translate_ar.ft_ar_mt || material;
    }

    return {
      foo_id: food.foo_id,
      foo_price: food.foo_price,
      foo_img: food.foo_img,
      foo_name: name,
      foo_material: material,
    };
  });
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
        revi_reco_vegan: reviData.revi_reco_vegan ?? null,
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

  //===== 한 메뉴에 대한 리뷰 조회
  async oneMenuReviews(
    sto_id: number,
    foo_id: number,
    lang: string,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;

    // 전체 개수
    const totalCount = await this.prisma.review.count({
      where: {
        store_id: sto_id,
        revi_status: 0,
        foods: {
          some: {
            foo_id: foo_id,
          },
        },
      },
    });

    // 페이징된 리뷰 조회
    const reviews = await this.prisma.review.findMany({
      where: {
        store_id: sto_id,
        revi_status: 0,
        foods: {
          some: {
            foo_id: foo_id,
          },
        },
      },
      select: {
        revi_id: true,
        revi_reco_step: true,
        revi_create: true,
        revi_content: lang === 'ko',

        review_translate_en:
          lang === 'en' ? { select: { rt_content_en: true } } : false,

        review_translate_ar:
          lang === 'ar' ? { select: { rt_ar_content: true } } : false,

        ReviewImage: {
          select: { revi_img_url: true },
        },
      },
      orderBy: {
        revi_create: 'desc',
      },
      skip,
      take: limit,
    });

    // 날짜 및 content 포맷 가공
    const formatted = reviews.map((r) => {
      let content = '';
      if (lang === 'ko') content = r.revi_content ?? '';
      else if (lang === 'en')
        content = r.review_translate_en?.rt_content_en ?? '';
      else if (lang === 'ar')
        content = r.review_translate_ar?.rt_ar_content ?? '';

      return {
        revi_id: r.revi_id,
        revi_reco_step: r.revi_reco_step,
        revi_create: new Date(r.revi_create).toISOString().substring(0, 10),
        content,
        images: r.ReviewImage.map((img) => img.revi_img_url),
      };
    });

    return {
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      reviews: formatted,
    };
  }

  // 유저가 자기가 쓴 리뷰 볼 때
  async oneUserReview(ld_log_id: string, lang: string) {
    const user = await this.prisma.loginData.findUnique({
      where: { ld_log_id },
      select: { ld_user_id: true },
    });

    if (!user?.ld_user_id) {
      return { message: '유저를 찾을 수 없습니다.', status: 'false' };
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        user_id: user.ld_user_id,
        revi_status: 0,
      },
      select: {
        revi_id: true,
        revi_create: true,
        revi_content: lang === 'ko',
        review_translate_en:
          lang === 'en' ? { select: { rt_content_en: true } } : false,
        review_translate_ar:
          lang === 'ar' ? { select: { rt_ar_content: true } } : false,
        ReviewImage: {
          select: { revi_img_url: true },
        },
        store: {
          select: {
            sto_name: true,
          },
        },
      },
      orderBy: {
        revi_create: 'desc',
      },
    });

    return reviews.map((r) => ({
      revi_id: r.revi_id,
      revi_create: new Date(r.revi_create).toISOString().substring(0, 10),
      content:
        lang === 'ko'
          ? (r.revi_content ?? '')
          : lang === 'en'
            ? (r.review_translate_en?.rt_content_en ?? '')
            : (r.review_translate_ar?.rt_ar_content ?? ''),
      images: r.ReviewImage.map((img) => img.revi_img_url),
      store_name: r.store.sto_name,
    }));
  }

  // 유저가 나중에 쓰기 등록한 리뷰볼 때
  async oneUserLaterReview(ld_log_id: string) {
    const user = await this.prisma.loginData.findUnique({
      where: { ld_log_id },
      select: { ld_user_id: true },
    });

    if (!user?.ld_user_id) {
      return { message: '유저를 찾을 수 없습니다.', status: 'false' };
    }

    const laterReviews = await this.prisma.review.findMany({
      where: {
        user_id: user.ld_user_id,
        revi_status: 1,
      },
      select: {
        revi_id: true,
        revi_create: true,
        store: {
          select: {
            sto_name: true,
          },
        },
      },
      orderBy: {
        revi_create: 'desc',
      },
    });

    return laterReviews.map((r) => ({
      revi_id: r.revi_id,
      revi_create: new Date(r.revi_create).toISOString().substring(0, 10),
      store_name: r.store.sto_name,
    }));
  }
  //====== 나중에 쓸 리뷰 등록
  // 일단 가게로 등록
  async userRegistWriteLater(ld_log_id: string, sto_id: number) {
    const user = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: ld_log_id,
      },
      select: {
        ld_user_id: true,
      },
    });

    if (!user?.ld_user_id || user.ld_user_id == null) {
      return {
        message: '[Review] 토큰에서 유저 아이디 추출 실패',
        status: 'false',
      };
    }

    const existing = await this.prisma.review.findFirst({
      where: {
        user_id: user.ld_user_id,
        store_id: sto_id,
        revi_status: 1,
      },
    });

    if (existing) {
      return {
        message: '[Review] 이미 작성 대기 중인 리뷰가 존재합니다.',
        review_id: existing.revi_id,
        status: 'exist',
      };
    }

    const review = await this.prisma.review.create({
      data: {
        store_id: sto_id,
        user_id: user.ld_user_id,
        revi_status: 1,
        revi_reco_step: -1,
      },
    });

    return {
      message: '나중에 쓸 리뷰로 등록 완료',
      review_id: review.revi_id,
      status: 'success',
    };
  }

  // 나중에 쓰기한 리뷰 작성
  async writeLaterReview(
    ld_log_id: string,
    lang: string,
    data: WriteLaterReviewDto,
    files?: Express.Multer.File[],
  ) {
    const user = await this.prisma.loginData.findUnique({
      where: { ld_log_id: ld_log_id },
      select: { ld_user_id: true },
    });

    if (!user?.ld_user_id) {
      return { message: '유저를 찾을 수 없습니다.', status: 'false' };
    }

    const review = await this.prisma.review.findUnique({
      where: { revi_id: data.review_id },
    });

    if (
      !review ||
      review.revi_status !== 1 ||
      review.user_id !== user.ld_user_id
    ) {
      return {
        message: '작성 가능한 리뷰가 아니거나, 권한이 없습니다.',
        status: 'false',
      };
    }

    // 이미지 업로드
    let imageUrls: string[] = [];
    if (files && files.length > 0) {
      imageUrls = await this.reviewStorageService.uploadReviewImages(files);
    }

    // 본 리뷰로 업데이트
    await this.prisma.review.update({
      where: { revi_id: data.review_id },
      data: {
        revi_content: data.revi_content ?? null,
        revi_reco_step: data.revi_reco_step,
        revi_reco_vegan: data.revi_reco_vegan ?? null,
        revi_status: 0,
      },
    });

    // 이미지 저장
    if (imageUrls.length > 0) {
      await this.prisma.reviewImage.createMany({
        data: imageUrls.map((url) => ({
          revi_img_url: url,
          review_id: data.review_id,
        })),
      });
    }

    // 번역
    if (data.revi_content) {
      try {
        const { from, to } = this.getFromToLanguages(lang);
        const translated = await this.translateService.translateMany(
          data.revi_content,
          to,
          from,
        );

        for (const t of translated[0]?.translations || []) {
          if (t.to === 'en') {
            await this.prisma.reviewTranslateEN.upsert({
              where: { revi_id: data.review_id },
              update: { rt_content_en: t.text },
              create: {
                revi_id: data.review_id,
                rt_content_en: t.text,
              },
            });
          }

          if (t.to === 'ar') {
            await this.prisma.reviewTranslateAR.upsert({
              where: { revi_id: data.review_id },
              update: { rt_ar_content: t.text },
              create: {
                revi_id: data.review_id,
                rt_ar_content: t.text,
              },
            });
          }
        }
      } catch (err) {
        console.error('[리뷰 번역 오류]', err);
      }
    }

    return {
      message: '리뷰가 성공적으로 작성되었습니다.',
      review_id: data.review_id,
      uploaded_images: imageUrls.length,
    };
  }
}
