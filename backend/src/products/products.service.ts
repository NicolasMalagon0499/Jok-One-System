import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {

  constructor(private prisma: PrismaService) {}

  async createProduct(data: any) { // O usa tu CreateProductDto
    return this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        stock: Number(data.stock),
        minStock: Number(data.minStock ?? 3),
        salePrice: Number(data.salePrice),
        costPrice: Number(data.costPrice),
        // Excluimos totalmente cualquier campo basura como 'existe' que venga desde el frontend
      }
    });
  }

  /** Edición completa del producto (no incluye stock: eso usa updateStock). */
  async updateProduct(id: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.salePrice !== undefined) updateData.salePrice = Number(data.salePrice);
    if (data.costPrice !== undefined) updateData.costPrice = Number(data.costPrice);
    if (data.minStock !== undefined) updateData.minStock = Number(data.minStock);
    return this.prisma.product.update({ where: { id }, data: updateData });
  }

  // 1. FILTRADO: Trae solo los productos que NO han sido eliminados de la barbería
  async getProducts() {
    return this.prisma.product.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc' // Opcional: te los organiza alfabéticamente en la app
      }
    });
  }

  async sellProduct(productId: string, quantity: number, barberId: string) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Producto no encontrado');
      if (product.stock < quantity) throw new Error('Stock insuficiente');

      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } }
      });

      return { message: 'Producto vendido', product, quantity };
    });
  }

  // 2. FILTRADO: Alerta de stock bajo únicamente para productos vigentes
  async getLowStockProducts() {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true
      }
    });
    return products.filter(p => p.stock <= p.minStock);
  }

  async updateStock(id: string, newStock: number) {
    return this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });
  }

  // 3. BORRADO LÓGICO: Cambia el estado a inactivo para proteger el historial de ventas
  async removeProduct(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}