import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { UserRole } from '../../common/enums/role.enum.js';

export class QueryUsersDto extends PaginationQueryDto {
  /**
   * Search query matching name or email
   * @example budi
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter by user role
   * @example EMPLOYEE
   */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /**
   * Filter by account active status
   * @example true
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
