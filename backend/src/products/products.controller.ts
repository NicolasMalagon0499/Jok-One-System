import { Controller, Post, Body, Get, UseGuards, Param, Patch, Delete } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
@UseGuards(JwtGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}
/*
  @Post()
  @Roles('ADMIN')
  async createProduct(@Body() data: any) {
    return this.productsService.createProduct(data);
  }
*/

@Post()
  @Roles('ADMIN')
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productsService.createProduct(createProductDto);
  }
  @Get()
  @Roles('ADMIN','BARBER')
  async getProducts() {
    return this.productsService.getProducts();
  }

  @Post('sell')
  @Roles('ADMIN', 'BARBER')
  async sellProduct(@Body() body: { productId: string; quantity: number; barberId: string }) {
    return this.productsService.sellProduct(body.productId, body.quantity, body.barberId);
  }

  @Get('low-stock')
  @Roles('ADMIN')
  async getLowStockProducts() {
    return this.productsService.getLowStockProducts();
  }

  // Ruta para actualizar stock: PATCH /products/:id/stock
@Patch(':id/stock')
 @Roles('ADMIN')
async updateStock(
  @Param('id') id: string,
  @Body('stock') stock: number
) {
  return this.productsService.updateStock(id, stock);
}

// Ruta para editar nombre/descripción/precios/stock mínimo: PATCH /products/:id
@Patch(':id')
 @Roles('ADMIN')
async updateProduct(@Param('id') id: string, @Body() data: any) {
  return this.productsService.updateProduct(id, data);
}

// Ruta para eliminar: DELETE /products/:id
@Delete(':id')
 @Roles('ADMIN')
async removeProduct(@Param('id') id: string) {
  return this.productsService.removeProduct(id);
}
}