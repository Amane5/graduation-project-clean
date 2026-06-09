import { JwtAuthGuard } from '@/auth/guards/jwt.guard';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UpdateChildDto } from './dto/update-child.dto';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorators';

@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  getChildren(@Req() req) {
    return this.childrenService.getChildren(req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  deleteChild(@Param('id') id: string, @Req() req) {
    return this.childrenService.deleteChild(Number(id), req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  updateChild(
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
    @Req() req,
  ) {
    return this.childrenService.updateChild(+id, dto, req.user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  createChild(@Body() dto: CreateChildDto, @Req() req) {
    return this.childrenService.createChild(dto, req.user.sub);
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('parent')
  getAccounts(@Req() req) {
    if (req.user.type !== 'parent') {
      throw new ForbiddenException({
        message: 'Access denied',
        error: 'FORBIDDEN',
      });
    }
    console.log('USER:', req.user);
    return this.childrenService.getAccount(req.user.sub);
  }
}
