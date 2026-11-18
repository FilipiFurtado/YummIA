export interface ProductVariant {
  id: number;
  name: string;
  price: string;
  available: boolean;
  productId: number;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  restaurantId: number;
  variants: ProductVariant[];
}

export interface Restaurant {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  products?: Product[];
}

export interface CartItem {
  cartItemId: number;
  productId: number;
  productName: string;
  variantId: number;
  variantName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  available: boolean;
}

export interface CartRestaurant {
  restaurantId: number;
  restaurantName: string;
  subtotal: string;
  items: CartItem[];
}

export interface Cart {
  cartId: string;
  status: string;
  totalQuantity: number;
  restaurants: CartRestaurant[];
  subtotal: string;
  currency: string;
}

export interface Address {
  id: number;
  label: string | null;
  street: string;
  number: string;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode: string;
}

export interface QuoteItem {
  variantId: number;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface QuoteRestaurant {
  restaurantId: number;
  restaurantName: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  items: QuoteItem[];
}

export interface CheckoutQuote {
  addressId: number;
  restaurants: QuoteRestaurant[];
  subtotal: string;
  deliveryTotal: string;
  total: string;
  currency: string;
  quoteHash: string;
}