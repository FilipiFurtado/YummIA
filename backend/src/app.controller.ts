import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {

  @Get()
  getStatus() {
    return {
      status: 'online',
      application: 'Restaurant Marketplace API',
      version: '1.0.0',
      message: 'API funcionando corretamente'
    };
  }
}