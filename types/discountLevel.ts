export interface DiscountLevelInfo {
  quantity: number;
  discountLevel: string;
}

export interface DiscountLevelsMap {
  LICENSE?: DiscountLevelInfo;
  TRANSACTION?: DiscountLevelInfo;
}
