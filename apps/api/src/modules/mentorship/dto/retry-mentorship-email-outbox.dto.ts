import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail } from "class-validator";

export class RetryMentorshipEmailOutboxDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  recipients!: string[];
}
