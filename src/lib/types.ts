export interface Bouquet {
  id: string;
  name: string;
  color: string;
  description: string;
  image: string;
  priceSmall: string;
  priceMid: string;
  priceLarge: string;
  available: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  priceLabel: string;
  image: string;
  category: string;
  available: boolean;
  sortOrder: number;
}
