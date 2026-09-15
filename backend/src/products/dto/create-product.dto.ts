export class CreateProductDto {

  name!: string;

  description?: string;

  stock!: number;

  minStock?: number;

  salePrice!: number;

  costPrice!: number;

}