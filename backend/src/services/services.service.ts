import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface CreateServiceDto  {
  
  price: number;
  tip: number;
  barberId: string;
  
}


@Injectable()
export class ServicesService {

constructor(private prisma: PrismaService) {}


async createService(data: CreateServiceDto) {

    return this.prisma.service.create({
    data:{
        price: data.price,
        tip: data.tip,
        barberId: data.barberId

    }
    });

}

calculateDailyEarnings(services: any[]) {

    let totalServices = 0;
    let totalTips = 0;


    services.forEach(service => {
        totalServices += service.price;
        totalTips += service.tip;

    });

    const barberShare= totalServices * 0.5; 
    const businessShare= totalServices * 0.5;
    const barberTotal= barberShare + totalTips;

    let compensation = 0;

    if (barberTotal <30.000){

        compensation = 30.000 - barberTotal;

    }
    return {
        totalServices,
        totalTips,  
        barberShare,
        businessShare,
        barberTotal,
        compensation
    };
}
async getDailyEarnings(barberId: string) {
  
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const services = await this.prisma.service.findMany({
    where: {
      barberId: barberId,
      createdAt: {
        gte: todayStart,
        lte: todayEnd
      }
    }
  });

  return this.calculateDailyEarnings(services);
}


async getAllDailyEarnings() {

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); 

    const services = await this.prisma.service.findMany({
        where: {
            createdAt: {
            gte: todayStart,
            lte: todayEnd
            }
        },
        include: {
            barber: true
        }
        });
        const grouped ={};

        services.forEach(service => {
            if (!grouped[service.barberId]) {
                grouped[service.barberId] = [];
            }
            grouped[service.barberId].push(service);
        });

        const results: any [] = [];

        for (const barberId in grouped) {
        const barberServices = grouped[barberId];

            const earnings = this.calculateDailyEarnings(barberServices);

            const barberName = barberServices[0].barber.name;

            results.push({
                barberId,
                barberName,
                ...earnings
            });
            }
        return results;


    }     


    
    
    
    async getWeeklyEarnings() {

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // lunes
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const services = await this.prisma.service.findMany({
    where: {
      createdAt: {
        gte: weekStart,
        lte: weekEnd
      }
    },
    include: {
      barber: {
        select: {
          name: true
        }
      }
    }
  });

  const grouped: any = {};

  services.forEach(service => {
    if (!grouped[service.barberId]) {
      grouped[service.barberId] = [];
    }
    grouped[service.barberId].push(service);
  });

  const result: any[] = [];

  for (const barberId in grouped) {
    const barberServices = grouped[barberId];

    const earnings = this.calculateDailyEarnings(barberServices);

    const barberName = barberServices[0].barber.name;

    result.push({
      barberId,
      barberName,
      ...earnings
    });
  }

  return result;
}
    
//funcion para calcular las ganancias quincenales, se divide el mes en dos periodos: del 1 al 15 y del 16 al final del mes. Se obtiene la fecha actual y se determina a qué periodo pertenece. Luego, se consulta la base de datos para obtener los servicios realizados en ese periodo y se agrupan por barbero para calcular las ganancias totales, la parte del barbero, la parte del negocio y la compensación si es necesario.

 async getBiweeklyEarnings() {

  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  let startDate: Date;
  let endDate: Date;

  if (day <= 15) {
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month, 15, 23, 59, 59);
  } else {
    startDate = new Date(year, month, 16);
    endDate = new Date(year, month + 1, 0, 23, 59, 59);
  }

  const services = await this.prisma.service.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      barber: {
        select: {
          name: true
        }
      }
    }
  });

  const grouped: any = {};

  services.forEach(service => {
    if (!grouped[service.barberId]) {
      grouped[service.barberId] = [];
    }
    grouped[service.barberId].push(service);
  });

  const result: any[] = [];

  for (const barberId in grouped) {
    const barberServices = grouped[barberId];

    const earnings = this.calculateDailyEarnings(barberServices);

    const barberName = barberServices[0].barber.name;

    result.push({
      barberId,
      barberName,
      ...earnings
    });
  }

  return result;
}
    
async getMonthlyEarnings() {

  const now = new Date;

 const year = now.getFullYear();
 const month = now.getMonth();

 let startDate = new Date(year, month, 1);
 let endDate = new Date(year, month + 1, 0, 23, 59, 59);

 

const service = await this.prisma.service.findMany({
  where: {
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  },include: {
    barber: {
      select: {
        name: true
      }
    }
  }
});


const grouped: any = {};

  service.forEach(service => {
    if (!grouped[service.barberId]) {
      grouped[service.barberId] = [];
    }
    grouped[service.barberId].push(service);

    
  });

  if(service.length ===0 ) return [];

  const result: any[] = [];

  for (const barberId in grouped) {
    const barberServices = grouped[barberId]; 
    const earnings = this.calculateDailyEarnings(barberServices);
    const barberName = barberServices[0]?.barber?.name || "Sin nombre";

    result.push({
      barberId,
      barberName,
      ...earnings
    });

  }

  return result;
}
    
}    
    


