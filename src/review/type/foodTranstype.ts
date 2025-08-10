export type FoodWithOptionalTranslation = {
  foo_id: number;
  foo_price: number;
  foo_img: string | null;
  foo_name: string;
  foo_material: string[] | null;
  food_translate_en?: { ft_en_name?: string | null; ft_en_mt?: string[] | null };
  food_translate_ar?: { ft_ar_name?: string | null; ft_ar_mt?: string[] | null };
};
