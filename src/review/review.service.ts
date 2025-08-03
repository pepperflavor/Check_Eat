import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';
import { RegistFoodReviewDto } from './dto/regist-food-review.dto';
import { ReviewStorageService } from '../azure-storage/review-storage.service';

@Injectable()
export class ReviewService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reviewStorageService: ReviewStorageService,
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

  // 유저 리뷰 등록
  async userRegistReview(
    userId: number, 
    reviData: RegistFoodReviewDto, 
    files?: Express.Multer.File[]
  ) {
    // 메뉴 이름들, 추천 여부, 사진, 텍스트
    // 당장 리뷰 등록 안할거면 저장되도록 해야함
    // 유저 테이블 관계 연결 필요
    // 사진 애저에 저장해야함
    
    let imageUrls: string[] = [];
    
    // 이미지가 있으면 Azure에 업로드
    if (files && files.length > 0) {
      const uploadResults = await this.reviewStorageService.uploadMultiple(
        files, 
        'review-images'
      );
      imageUrls = uploadResults.map(result => result.url);
    }
    
    // DB에 리뷰 저장
    const review = await this.prisma.review.create({
      data: {
        revi_reco_step: reviData.revi_reco_step,
        revi_content: reviData.revi_content || null,
        revi_status: reviData.revi_status || 0,
        // revi_img: imageUrls.length > 0 ? imageUrls.join(',') : null, // 콤마로 구분된 URL들
        user_id: userId,
        store_id: reviData.store_id,
        foods: {
          connect: reviData.food_ids.map(id => ({ foo_id: id }))
        }
      },
      include: {
        foods: true,
        user: true,
        store: true
      }
    });
    
    return {
      message: '리뷰가 성공적으로 등록되었습니다.',
      review_id: review.revi_id,
      uploaded_images: imageUrls.length
    };
  }
}
