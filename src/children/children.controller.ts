import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  Req,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { UpdateChildDto } from './dto/update-child.dto';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { extname } from 'path/win32';
import { Roles } from '@/auth/decorators/roles.decorators';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { diskStorage } from 'multer';
import { AiService } from '@/ai/ai.service';

type AuthenticatedRequest = {
  user: {
    sub: number;
    type: string;
  };
};

@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  getChildren(@Req() req: AuthenticatedRequest) {
    return this.childrenService.getChildren(req.user.sub);
  }

  @Get('dashboard-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  getDashboardStats(@Req() req: AuthenticatedRequest) {
    return this.childrenService.getDashboardStats(req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  deleteChild(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.childrenService.deleteChild(Number(id), req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  updateChild(
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.childrenService.updateChild(+id, dto, req.user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  createChild(@Body() dto: CreateChildDto, @Req() req: AuthenticatedRequest) {
    return this.childrenService.createChild(dto, req.user.sub);
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  getAccounts(@Req() req: AuthenticatedRequest) {
    if (req.user.type !== 'parent') {
      throw new ForbiddenException({
        message: 'Access denied',
        error: 'FORBIDDEN',
      });
    }
    console.log('USER:', req.user);
    return this.childrenService.getAccount(req.user.sub);
  }

 @Post(':id/cartoonize')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('parent')
@UseInterceptors(
  FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueName =
          Date.now() + '-' + Math.round(Math.random() * 1e9);

        cb(
          null,
          uniqueName + extname(file.originalname),
        );
      },
    }),
  }),
)
async cartoonize(
  @Param('id', ParseIntPipe) childId: number,
  @Req() req: AuthenticatedRequest,
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException(
      'Image is required',
    );
  }

  return this.childrenService.cartoonizeChild(
    childId,
    req.user.sub,
    file.path,
  );
}
}
