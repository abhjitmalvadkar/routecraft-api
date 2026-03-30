import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('service-photo/:serviceId')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadServicePhoto(
    @Param('serviceId') serviceId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.uploadService.uploadServicePhoto(serviceId, file, user.orgId);
  }
}
