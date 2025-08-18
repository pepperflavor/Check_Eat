export type RegistFoodInput = {
  foo_id: number;
  foo_name?: string;
  foo_price?: string | number;
  foo_vegan: number; // 1-7 범위의 필수값
  sto_id: number;
};
