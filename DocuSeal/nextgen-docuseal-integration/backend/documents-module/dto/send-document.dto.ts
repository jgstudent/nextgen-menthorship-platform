import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsEmail, IsOptional, IsString, ValidateNested } from "class-validator";

export class DocumentSignerDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class SendDocumentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DocumentSignerDto)
  signers!: DocumentSignerDto[];
}
